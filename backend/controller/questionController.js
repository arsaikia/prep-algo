import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import { randomUUID } from 'node:crypto';
import { findSubmission, listProgress, recordAttempt, submissionHash } from '../repositories/progress.js';
import { runCode } from '../utils/codeExecution.js';
import logger from '../config/logger.js';
import { requestExecutionSignal } from '../utils/executionBudget.js';
import {
    answerFormatFor,
    assertContentRevision,
    getGradingSpec,
    getHiddenTestCaseCount,
    getItemByLegacyId,
    getItemBySlug,
    gradeQuiz,
    listItems,
    redactHiddenResults,
} from '../utils/contentStore.js';

/*
 * Question content is read from the built content catalog, not the database.
 * `content/` is the single source of truth for what a question says; the
 * database only records who solved what. Response shapes are unchanged, so
 * clients cannot tell the difference — except that a problem authored and
 * built is now immediately servable, with no database row to create.
 */

/**
 * Items that appear in question lists: anything a learner can open and that
 * participates in progress. Modules are navigation, and topics authored after
 * the database export have no id to join progress on.
 */
function listableItems(domain) {
    return listItems().filter(
        (item) => item.legacyId && item.type !== 'module' && (!domain || item.domain === domain),
    );
}

/** The row shape list endpoints have always returned. */
function toListRow(item) {
    return {
        _id: item.legacyId,
        name: item.title,
        link: item.link || item.slug,
        slug: item.slug,
        revision: item.revision,
        type: item.type,
        group: item.group,
        difficulty: item.difficulty ?? null,
        list: item.lists ?? [],
        order: item.order,
        domain: item.domain,
        answerFormat: answerFormatFor(item),
        description: item.description || '',
        exampleTestCases: item.exampleTestCases || [],
        availableForSolve: item.availableForSolve,
    };
}

/*
 * @desc     Get All Questions (without solve history)
 * @route    GET /api/v1/questions
 * @access   Public
 */
const getQuestions = asyncHandler(async (req, res) => {
    const rows = listableItems(req.query.domain).map(toListRow);

    return res.status(200).json({
        success: true,
        count: rows.length,
        data: rows
    });
});

/*
 * @desc     Get Question by ID
 * @route    GET /api/v1/questions/:questionId
 * @access   Public
 */
const getQuestionById = asyncHandler(async (req, res, next) => {
    const { questionId } = req.params;
    logger.debug({ questionId }, 'fetching question by slug');

    const item = getItemBySlug(questionId);
    if (!item || item.type === 'module') {
        return next(new ErrorResponse('Question not found', 404));
    }

    // Only cases the author explicitly marked public are returned; the rest
    // stay server-side and are reported as a count.
    const publicCases = (getGradingSpec(item.slug)?.testCases || [])
        .filter(tc => tc.isHidden === false)
        .map(tc => ({
            inputs: tc.inputs || [],
            expectedOutput: tc.expectedOutput || '',
            isHidden: false
        }));

    const response = {
        id: item.legacyId ?? null,
        slug: item.slug,
        revision: item.revision,
        type: item.type,
        title: item.title,
        description: item.description || item.summary || 'No description available',
        difficulty: item.difficulty ?? null,
        domain: item.domain || 'algorithms',
        answerFormat: answerFormatFor(item),
        exampleTestCases: (item.exampleTestCases || []).map(tc => ({
            inputs: tc.inputs || [],
            expectedOutput: tc.expectedOutput || '',
            explanation: tc.explanation || ''
        })),
        testCases: publicCases,
        hiddenTestCaseCount: getHiddenTestCaseCount(item.slug),
        topics: [item.group],
        templates: item.templates || { python: '', javascript: '' },
        types: item.types ?? null
    };

    if (item.type === 'quiz') {
        response.mcqOptions = (item.options || []).map(opt => ({ id: opt.id, text: opt.text }));
        if (item.topic) response.topic = item.topic;
    }

    // Topics are read in the System Design reader, not solved. The body is
    // already public on the CDN; it is included so a client that lands here
    // can render or redirect instead of showing an empty solver.
    if (item.type === 'topic') {
        response.module = item.module;
        response.body = item.body || '';
    }

    return res.status(200).json(response);
});

async function saveGradedSubmission(req, item, key, hash, success, result) {
    let saved;
    try {
        saved = await recordAttempt({
            userId: String(req.user._id),
            contentId: String(item.legacyId || item.slug),
            submissionKey: key,
            requestHash: hash,
            success,
            result,
            timeSpent: req.body.timeTaken ?? null,
        });
    } catch (error) {
        if (error.statusCode === 409) throw error;
        logger.error({ code: error.code, questionId: item.slug }, 'failed to persist graded submission');
        return { ...result, attemptSaved: false, progressSaved: false };
    }
    return saved;
}

/*
 * @desc     Submit code for a question and validate against test cases
 * @route    POST /api/v1/questions/:questionId/submit
 * @access   Private (mounted behind `protect`)
 */
const submitCode = asyncHandler(async (req, res) => {
        const { questionId } = req.params;
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        const item = getItemBySlug(questionId);
        if (!item || item.type !== 'problem') {
            return res.status(404).json({ error: 'Question not found' });
        }
        const key = req.body.submissionId || randomUUID();
        const hash = submissionHash(item.legacyId || item.slug, {
            code, timeTaken: req.body.timeTaken ?? null, contentRevision: req.body.contentRevision ?? null,
        });
        const previous = await findSubmission(String(req.user._id), key, String(item.legacyId || item.slug), hash);
        if (previous) return res.json(previous);
        assertContentRevision(item, req.body.contentRevision);

        // Grade against the built content bundle, never against anything the
        // client sent. `content/` is the source of truth; the database only
        // records who solved what.
        const spec = getGradingSpec(item.slug);

        if (!spec) {
            logger.warn({ questionId }, 'no test cases in content bundle for question');
            return res.status(400).json({ error: 'No test cases available for this question' });
        }

        const results = await runCode(code, spec.testCases, spec.types, {
            signal: requestExecutionSignal(req, res),
        });

        const passedTests = results.filter(r => r.passed).length;
        const totalTests = results.length;
        const score = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

        const solved = totalTests > 0 && passedTests === totalTests;
        const result = {
            results: redactHiddenResults(results, spec.testCases),
            score,
            passedTests,
            totalTests,
            solved,
            questionId: String(item.legacyId)
        };
        res.json(await saveGradedSubmission(req, item, key, hash, solved, result));
});

/*
 * @desc     Grade a multiple-choice answer and record a correct one
 * @route    POST /api/v1/questions/:questionId/submit-mcq
 * @access   Private (mounted behind `protect`)
 *
 * The authenticated twin of `POST /quiz/:slug/grade`: same answer key, same
 * result, plus the progress write — a correct answer counts as a solve, the
 * same way a passing code submission does.
 */
const submitMcqAnswer = asyncHandler(async (req, res, next) => {
    const { questionId } = req.params;
    const { selectedOptionId } = req.body;

    // Older clients sent the database id rather than the slug.
    const item = getItemBySlug(questionId) || getItemByLegacyId(questionId);
    if (!item) return next(new ErrorResponse('Question not found', 404));
    if (item.type !== 'quiz') return next(new ErrorResponse('Not an MCQ question', 400));
    const key = req.body.submissionId || randomUUID();
    const hash = submissionHash(item.legacyId || item.slug, {
        selectedOptionId, timeTaken: req.body.timeTaken ?? null, contentRevision: req.body.contentRevision ?? null,
    });
    const previous = await findSubmission(String(req.user._id), key, String(item.legacyId || item.slug), hash);
    if (previous) return res.status(200).json({ success: true, data: previous });
    assertContentRevision(item, req.body.contentRevision);

    const graded = gradeQuiz(item.slug, selectedOptionId);
    if (!graded) return next(new ErrorResponse('Question not found', 404));
    if (!graded.selectedOptionId) return next(new ErrorResponse('Invalid option', 400));

    const correct = graded.explanations.find(e => e.isCorrect);
    const result = await saveGradedSubmission(req, item, key, hash, graded.passed, {
        ...graded,
        correct: graded.passed,
        explanation: correct?.explanation || '',
        questionId: String(item.legacyId || item.slug),
    });
    res.status(200).json({
        success: true,
        data: result,
    });
});

/*
 * @desc     Get All Questions with User Progress
 * @route    GET /api/v1/questions/get-questions/:userId
 * @access   Private (owner only)
 */
const getAllQuestionsWithUserProgress = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    try {
        const items = listableItems(req.query.domain);

        const solveHistory = await listProgress(userId);

        const solvedQuestionsMap = {};
        solveHistory.forEach(history => {
            solvedQuestionsMap[history.questionId.toString()] = {
                solved: true,
                solveCount: history.solveCount,
                lastSolved: history.lastUpdatedAt,
                firstSolved: history.firstSolvedAt
            };
        });

        const groupedQuestions = {};
        const groups = [];

        items.forEach(item => {
            const row = toListRow(item);
            if (!groupedQuestions[row.group]) {
                groupedQuestions[row.group] = [];
                groups.push(row.group);
            }
            const progress = solvedQuestionsMap[row._id];
            groupedQuestions[row.group].push({
                ...row,
                solved: progress?.solved || false,
                solveCount: progress?.solveCount || 0,
                lastSolved: progress?.lastSolved || null,
                firstSolved: progress?.firstSolved || null
            });
        });

        res.status(200).json({
            success: true,
            count: items.length,
            data: {
                groups: groups,
                questions: groupedQuestions
            }
        });

    } catch (error) {
        logger.error({ err: error }, 'error in getAllQuestionsWithUserProgress');
        return next(new ErrorResponse('Server Error', 500));
    }
});

export {
    getQuestions,
    getQuestionById,
    submitCode,
    submitMcqAnswer,
    getAllQuestionsWithUserProgress
};
