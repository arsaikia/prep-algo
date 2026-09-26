import Question from '../models/Question.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../middleware/error.js';
import { v4 as uuid } from 'uuid';
import SolveHistory from '../models/SolveHistory.js';
import { runPythonCode } from '../utils/codeExecution.js';
import logger from '../config/logger.js';
import { mongoCircuitBreaker } from '../config/circuitBreakers.js';

/*
 * @desc     Get All Questions (without solve history)
 * @route    GET /api/v1/questions
 * @access   Public
 */
const getQuestions = asyncHandler(async (req, res, next) => {
    const filter = {};
    if (req.query.domain) filter.domain = req.query.domain;

    const questions = await mongoCircuitBreaker.execute(() =>
        Question.find(filter)
            .select('_id name link group difficulty list order testCases exampleTestCases description domain answerFormat')
            .sort({ order: 1 })
    );

    // Add comprehensive availability flag based on description, example test cases, and test cases
    const questionsWithAvailability = questions.map(question => {
        const obj = question.toObject();
        const isCode = obj.answerFormat === 'code' || !obj.answerFormat;
        const availableForSolve = isCode
            ? (question.description && question.description.trim() !== '') &&
              ((question.testCases && question.testCases.length > 0) ||
                  (question.exampleTestCases && question.exampleTestCases.length > 0))
            : true;

        // testCases are only needed to derive availability — never expose the
        // grading set (hidden cases included) on a list endpoint.
        const { testCases, ...safe } = obj;
        return { ...safe, availableForSolve };
    });

    return res.status(200).json({
        success: true,
        count: questions.length,
        data: questionsWithAvailability
    });
});

/*
 * @desc     Get Question by ID
 * @route    GET /api/v1/questions/:questionId
 * @access   Public
 */
const getQuestionById = asyncHandler(async (req, res, next) => {
    const { questionId } = req.params;
    logger.debug({ questionId }, 'fetching question by link');

    const question = await mongoCircuitBreaker.execute(() =>
        Question.findOne({
            $or: [
                { link: questionId },
                { link: `${questionId}/` }
            ]
        }).select('_id name description difficulty group exampleTestCases testCases templates types domain answerFormat mcqOptions designPrompt')
    );

    if (!question) {
        return next(new ErrorResponse('Question not found', 404));
    }

    const response = {
        id: question._id,
        title: question.name,
        description: question.description || 'No description available',
        difficulty: question.difficulty,
        domain: question.domain || 'algorithms',
        answerFormat: question.answerFormat || 'code',
        exampleTestCases: question.exampleTestCases?.map(tc => ({
            inputs: tc.inputs || [],
            expectedOutput: tc.expectedOutput || '',
            explanation: tc.explanation || ''
        })) || [],
        // isHidden defaults to true in the schema; treat anything not
        // explicitly false as hidden so legacy docs never leak.
        testCases: question.testCases
            ?.filter(tc => tc.isHidden === false)
            .map(tc => ({
                inputs: tc.inputs || [],
                expectedOutput: tc.expectedOutput || '',
                isHidden: false
            })) || [],
        hiddenTestCaseCount: question.testCases?.filter(tc => tc.isHidden !== false).length || 0,
        topics: [question.group],
        templates: question.templates || { python: '', javascript: '' }
    };

    if (question.answerFormat === 'mcq' && question.mcqOptions?.length > 0) {
        response.mcqOptions = question.mcqOptions.map(opt => ({
            id: opt.id,
            text: opt.text
        }));
    }

    if (question.answerFormat === 'design_doc' && question.designPrompt) {
        response.designPrompt = {
            scenario: question.designPrompt.scenario,
            requirements: question.designPrompt.requirements,
            constraints: question.designPrompt.constraints,
            evaluationCriteria: question.designPrompt.evaluationCriteria
        };
    }

    return res.status(200).json(response);
});

/*
 * @desc     Submit code for a question and validate against test cases
 * @route    POST /api/v1/questions/:questionId/submit
 * @access   Public
 */
const submitCode = async (req, res) => {
    try {
        const { questionId } = req.params;
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        // Find the question
        const question = await Question.findOne({
            $or: [
                { link: questionId },
                { link: `${questionId}/` }
            ]
        }).select('_id name description difficulty group exampleTestCases testCases templates types');

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Check if question is complete (has description and test cases)
        if (!question.description || question.description.trim() === '') {
            logger.warn({ questionId }, 'no description for question');
            return res.status(400).json({ error: 'Question description is not available' });
        }

        if (!question.testCases || question.testCases.length === 0) {
            logger.warn({ questionId }, 'no test cases for question');
            return res.status(400).json({ error: 'No test cases available for this question' });
        }

        // Run the code against test cases
        const results = await runPythonCode(code, question.testCases, question.types);

        // Calculate score
        const passedTests = results.filter(r => r.passed).length;
        const totalTests = results.length;
        const score = (passedTests / totalTests) * 100;

        res.json({
            results,
            score,
            passedTests,
            totalTests
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
 * @desc     Get All Questions with User Progress
 * @route    GET /api/v1/questions/get-questions/:userId
 * @access   Public
 */
const submitMcqAnswer = asyncHandler(async (req, res, next) => {
    const { questionId } = req.params;
    const { selectedOptionId } = req.body;

    const question = await Question.findOne({
        $or: [{ link: questionId }, { link: `${questionId}/` }]
    }).select('mcqOptions answerFormat');

    if (!question) return next(new ErrorResponse('Question not found', 404));
    if (question.answerFormat !== 'mcq') return next(new ErrorResponse('Not an MCQ question', 400));

    const correctOption = question.mcqOptions.find(o => o.isCorrect);
    const selected = question.mcqOptions.find(o => o.id === selectedOptionId);

    if (!selected) return next(new ErrorResponse('Invalid option', 400));

    res.status(200).json({
        success: true,
        data: {
            correct: selected.isCorrect,
            correctOptionId: correctOption?.id,
            explanation: correctOption?.explanation || ''
        }
    });
});

const getAllQuestionsWithUserProgress = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    try {
        const filter = {};
        if (req.query.domain) filter.domain = req.query.domain;

        const questions = await Question.find(filter)
            .select('_id name link group difficulty list order testCases exampleTestCases description domain answerFormat')
            .sort({ order: 1 });

        // Get user's solve history
        const solveHistory = await SolveHistory.find({ userId })
            .select('questionId solveCount lastUpdatedAt firstSolvedAt');

        // Create a map of solved questions for quick lookup
        const solvedQuestionsMap = {};
        solveHistory.forEach(history => {
            solvedQuestionsMap[history.questionId.toString()] = {
                solved: true,
                solveCount: history.solveCount,
                lastSolved: history.lastUpdatedAt,
                firstSolved: history.firstSolvedAt
            };
        });

        // Group questions by their group property and add solve status
        const groupedQuestions = {};
        const groups = [];

        questions.forEach(question => {
            const group = question.group;

            if (!groupedQuestions[group]) {
                groupedQuestions[group] = [];
                groups.push(group);
            }

            // Add solve status and availability to question
            const { testCases, ...safeQuestion } = question.toObject();
            const questionWithStatus = {
                ...safeQuestion,
                solved: solvedQuestionsMap[question._id.toString()]?.solved || false,
                solveCount: solvedQuestionsMap[question._id.toString()]?.solveCount || 0,
                lastSolved: solvedQuestionsMap[question._id.toString()]?.lastSolved || null,
                firstSolved: solvedQuestionsMap[question._id.toString()]?.firstSolved || null,
                availableForSolve: (question.description && question.description.trim() !== '') &&
                    ((question.testCases && question.testCases.length > 0) ||
                        (question.exampleTestCases && question.exampleTestCases.length > 0))
            };

            groupedQuestions[group].push(questionWithStatus);
        });

        // Return in the same format as the existing questions API
        const result = {
            groups: groups,
            questions: groupedQuestions
        };

        res.status(200).json({
            success: true,
            count: questions.length,
            data: result
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