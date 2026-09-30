import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import SolveHistory from '../models/SolveHistory.js';
import { runPythonCode } from '../utils/codeExecution.js';
import logger from '../config/logger.js';
import { invalidateUserCache } from '../middleware/cache.js';
import {
    answerFormatFor,
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
        templates: item.templates || { python: '', javascript: '' }
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

/**
 * Records a passing submission against the user's solve history.
 *
 * Until now nothing in the product ever wrote a solve: the frontend had a
 * `MARK_QUESTION_AS_DONE` action and a saga behind it, but no component ever
 * dispatched either, so a correct solution produced a score and then vanished.
 * Recording it here rather than in the client keeps the write next to the
 * grading that justifies it, so progress cannot disagree with the result the
 * user was just shown.
 *
 * Bookkeeping must never fail the submission. The user's code ran and passed;
 * reporting that is the endpoint's actual contract, so a write failure is
 * logged and surfaced as `progressSaved: false` instead of thrown.
 *
 * Returns whether the solve was durably recorded.
 */
const recordSolvedQuestion = async (user, item) => {
    const userId = user?._id || user?.id;
    // Progress is joined on the item's legacy id; the content build requires
    // one on every problem and quiz, so a miss here is a content bug.
    if (!userId || !item?.legacyId) return false;
    const questionId = String(item.legacyId);

    try {
        const now = new Date();
        await SolveHistory.findOneAndUpdate(
            { userId: String(userId), questionId },
            {
                // `solveCount` is required, so the insert has to establish it.
                // $inc does both jobs: 1 on insert, +1 on every re-solve.
                $inc: { solveCount: 1 },
                $set: {
                    lastUpdatedAt: now,
                    domain: item.domain || 'algorithms',
                    questionGroup: item.group,
                    questionDifficulty: item.difficulty,
                },
                $push: { solveHistory: { solvedAt: now, success: true } },
                $setOnInsert: { firstSolvedAt: now },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // /progress is cached per user; without this the badge the user just
        // earned would not appear until the cache expired.
        await invalidateUserCache(String(userId));
        return true;
    } catch (error) {
        logger.error({ err: error, questionId }, 'failed to record solve');
        return false;
    }
};

/*
 * @desc     Submit code for a question and validate against test cases
 * @route    POST /api/v1/questions/:questionId/submit
 * @access   Private (mounted behind `protect`)
 */
const submitCode = async (req, res) => {
    try {
        const { questionId } = req.params;
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        const item = getItemBySlug(questionId);
        if (!item || item.type !== 'problem') {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Grade against the built content bundle, never against anything the
        // client sent. `content/` is the source of truth; the database only
        // records who solved what.
        const spec = getGradingSpec(item.slug);

        if (!spec) {
            logger.warn({ questionId }, 'no test cases in content bundle for question');
            return res.status(400).json({ error: 'No test cases available for this question' });
        }

        const results = await runPythonCode(code, spec.testCases, spec.types);

        const passedTests = results.filter(r => r.passed).length;
        const totalTests = results.length;
        const score = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

        const solved = totalTests > 0 && passedTests === totalTests;
        const progressSaved = solved ? await recordSolvedQuestion(req.user, item) : false;

        res.json({
            results: redactHiddenResults(results, spec.testCases),
            score,
            passedTests,
            totalTests,
            solved,
            progressSaved,
            questionId: String(item.legacyId)
        });
    } catch (error) {
        logger.error({ err: error }, 'error in submitCode');
        res.status(500).json({
            error: 'Failed to execute code',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

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

    const graded = gradeQuiz(item.slug, selectedOptionId);
    if (!graded) return next(new ErrorResponse('Question not found', 404));
    if (!graded.selectedOptionId) return next(new ErrorResponse('Invalid option', 400));

    const progressSaved = graded.passed ? await recordSolvedQuestion(req.user, item) : false;
    const correct = graded.explanations.find(e => e.isCorrect);

    res.status(200).json({
        success: true,
        data: {
            ...graded,
            correct: graded.passed,
            explanation: correct?.explanation || '',
            progressSaved,
            questionId: String(item.legacyId)
        }
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

        const solveHistory = await SolveHistory.find({ userId })
            .select('questionId solveCount lastUpdatedAt firstSolvedAt');

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
