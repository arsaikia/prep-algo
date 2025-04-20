import express from 'express';
import Question from '../models/Question.js';

const router = express.Router();

// Fetch question details from our database
router.get('/question/:questionId', async (req, res) => {
    try {
        const { questionId } = req.params;
        console.log(`Fetching question by link: ${questionId}`);

        // Try to find the question by either link format (with or without trailing slash)
        const question = await Question.findOne({
            $or: [
                { link: questionId },
                { link: `${questionId}/` }
            ]
        }).select('_id name description difficulty group exampleTestCases testCases');

        if (!question) {
            console.error('Question not found in database');
            return res.status(404).json({
                error: 'Question not found',
                message: 'The requested question could not be found in our database.'
            });
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
                input: tc.input || '',
                expectedOutput: tc.expectedOutput || '',
                explanation: tc.explanation || ''
            })) || [],
            testCases: question.testCases?.map(tc => ({
                input: tc.input || '',
                expectedOutput: tc.expectedOutput || '',
                isHidden: tc.isHidden ?? true
            })) || [],
            topics: [question.group]
        };

        // Log the response for debugging
        console.log('Response:', JSON.stringify(response, null, 2));

        res.json(response);
    } catch (error) {
        console.error('Error fetching question:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'An unexpected error occurred while fetching the question.'
        });
    }
});

export default router; 