import Question from '../models/Question.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../middleware/error.js';
import { v4 as uuid } from 'uuid';
import SolveHistory from '../models/SolveHistory.js';
import { runPythonCode } from '../utils/codeExecution.js';

/*
 * @desc     Get All Questions (without solve history)
 * @route    GET /api/v1/questions
 * @access   Public
 */
const getQuestions = asyncHandler(async (req, res, next) => {
    // Get all questions without any filters
    const questions = await Question.find()
        .select('_id name link group difficulty list order')
        .sort({ order: 1 });

    return res.status(200).json({
        success: true,
        count: questions.length,
        data: questions
    });
});

/*
 * @desc     Get Question by ID
 * @route    GET /api/v1/questions/:questionId
 * @access   Public
 */
const getQuestionById = asyncHandler(async (req, res, next) => {
    const { questionId } = req.params;
    console.log(`Fetching question by link: ${questionId}`);

    // Try to find the question by either link format (with or without trailing slash)
    const question = await Question.findOne({
        $or: [
            { link: questionId },
            { link: `${questionId}/` }
        ]
    }).select('_id name description difficulty group exampleTestCases testCases templates');

    if (!question) {
        console.error('Question not found in database');
        return next(new ErrorResponse('Question not found', 404));
    }

    console.log('Raw exampleTestCases:', question.exampleTestCases);
    console.log('Raw testCases:', question.testCases);

    // Format the response to match the expected structure
    const response = {
        id: question._id,
        title: question.name,
        description: question.description || 'No description available',
        difficulty: question.difficulty,
        exampleTestCases: question.exampleTestCases?.map(tc => ({
            inputs: tc.inputs || [],
            expectedOutput: tc.expectedOutput || '',
            explanation: tc.explanation || ''
        })) || [],
        testCases: question.testCases?.map(tc => ({
            inputs: tc.inputs || [],
            expectedOutput: tc.expectedOutput || '',
            isHidden: tc.isHidden ?? true
        })) || [],
        topics: [question.group],
        templates: question.templates || {
            python: '',
            javascript: ''
        }
    };

    // Log the response for debugging
    console.log('Response:', JSON.stringify(response, null, 2));

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
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        if (!question.testCases || question.testCases.length === 0) {
            console.error(`No test cases for question: ${questionId}`);
            return res.status(400).json({ error: 'No test cases available for this question' });
        }


        // Run the code against test cases
        const results = await runPythonCode(code, question.testCases);

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
        console.error('Error in submitCode:', error);
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
const getAllQuestionsWithUserProgress = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    try {
        // Get all questions (don't filter - always show all questions)
        const questions = await Question.find()
            .select('_id name link group difficulty list order')
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

            // Add solve status to question
            const questionWithStatus = {
                ...question.toObject(),
                solved: solvedQuestionsMap[question._id.toString()]?.solved || false,
                solveCount: solvedQuestionsMap[question._id.toString()]?.solveCount || 0,
                lastSolved: solvedQuestionsMap[question._id.toString()]?.lastSolved || null,
                firstSolved: solvedQuestionsMap[question._id.toString()]?.firstSolved || null
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
        console.error('Error in getAllQuestionsWithUserProgress:', error);
        return next(new ErrorResponse('Server Error', 500));
    }
});

export {
    getQuestions,
    getQuestionById,
    submitCode,
    getAllQuestionsWithUserProgress
}; 