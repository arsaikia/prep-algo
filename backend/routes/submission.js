import express from 'express';
import Question from '../models/Question.js';

const router = express.Router();

// Update test cases for a question
router.put('/question/:questionId/test-cases', async (req, res) => {
    try {
        const { questionId } = req.params;
        const { exampleTestCases, testCases } = req.body;

        // Validate input
        if (!Array.isArray(exampleTestCases) && !Array.isArray(testCases)) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Either exampleTestCases or testCases must be provided as arrays'
            });
        }

        // Additional validation for array inputs
        const validateTestCase = (tc, isExample = false) => {
            if (!Array.isArray(tc.inputs)) {
                throw new Error(`${isExample ? 'Example test' : 'Test'} case inputs must be an array`);
            }
            if (tc.inputs.length === 0) {
                throw new Error(`${isExample ? 'Example test' : 'Test'} case must have at least one input`);
            }
            if (!tc.expectedOutput) {
                throw new Error(`${isExample ? 'Example test' : 'Test'} case must have an expected output`);
            }
        };

        if (Array.isArray(exampleTestCases)) {
            exampleTestCases.forEach(tc => validateTestCase(tc, true));
        }
        if (Array.isArray(testCases)) {
            testCases.forEach(tc => validateTestCase(tc));
        }

        // Find the question
        const question = await Question.findOne({
            $or: [
                { link: questionId },
                { link: `${questionId}/` }
            ]
        });

        if (!question) {
            return res.status(404).json({
                error: 'Question not found',
                message: 'The requested question could not be found in our database.'
            });
        }

        // Update the test cases
        const updateData = {};
        if (Array.isArray(exampleTestCases)) {
            updateData.exampleTestCases = exampleTestCases;
        }
        if (Array.isArray(testCases)) {
            updateData.testCases = testCases;
        }

        // Update the question
        const updatedQuestion = await Question.findByIdAndUpdate(
            question._id,
            { $set: updateData },
            { new: true }
        );

        res.json({
            success: true,
            data: {
                id: updatedQuestion._id,
                exampleTestCases: updatedQuestion.exampleTestCases,
                testCases: updatedQuestion.testCases
            }
        });
    } catch (error) {
        console.error('Error updating test cases:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'An unexpected error occurred while updating the test cases.'
        });
    }
});

// Update templates for a question
router.put('/question/:questionId/templates', async (req, res) => {
    try {
        const { questionId } = req.params;
        const { templates } = req.body;

        // Validate input
        if (!templates || typeof templates !== 'object') {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Templates must be provided as an object'
            });
        }

        // Validate templates
        if (templates.python && typeof templates.python !== 'string') {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Python template must be a string'
            });
        }
        if (templates.javascript && typeof templates.javascript !== 'string') {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'JavaScript template must be a string'
            });
        }

        // Find the question
        const question = await Question.findOne({
            $or: [
                { link: questionId },
                { link: `${questionId}/` }
            ]
        });

        if (!question) {
            return res.status(404).json({
                error: 'Question not found',
                message: 'The requested question could not be found in our database.'
            });
        }

        // Update the templates
        const updateData = {
            templates: {
                ...question.templates,
                ...templates
            }
        };

        // Update the question
        const updatedQuestion = await Question.findByIdAndUpdate(
            question._id,
            { $set: updateData },
            { new: true }
        );

        res.json({
            success: true,
            data: {
                id: updatedQuestion._id,
                templates: updatedQuestion.templates
            }
        });
    } catch (error) {
        console.error('Error updating templates:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'An unexpected error occurred while updating the templates.'
        });
    }
});

// Update any question fields
router.put('/question/:questionId', async (req, res) => {
    try {
        const { questionId } = req.params;
        const updateData = req.body;

        // Validate input
        if (!updateData || typeof updateData !== 'object') {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Update data must be provided as an object'
            });
        }

        // List of allowed fields to update
        const allowedFields = [
            'name', 'link', 'group', 'difficulty', 'description',
            'list', 'order', 'exampleTestCases', 'testCases', 'templates'
        ];

        // Filter out any fields that are not in the allowed list
        const filteredUpdateData = Object.keys(updateData)
            .filter(key => allowedFields.includes(key))
            .reduce((obj, key) => {
                obj[key] = updateData[key];
                return obj;
            }, {});

        if (Object.keys(filteredUpdateData).length === 0) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'No valid fields to update'
            });
        }

        // Find the question
        const question = await Question.findOne({
            $or: [
                { link: questionId },
                { link: `${questionId}/` }
            ]
        });

        if (!question) {
            return res.status(404).json({
                error: 'Question not found',
                message: 'The requested question could not be found in our database.'
            });
        }

        // Update the question
        const updatedQuestion = await Question.findByIdAndUpdate(
            question._id,
            { $set: filteredUpdateData },
            { new: true }
        );

        res.json({
            success: true,
            data: updatedQuestion
        });
    } catch (error) {
        console.error('Error updating question:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'An unexpected error occurred while updating the question.'
        });
    }
});

// Submit code for execution
router.post('/submit', async (req, res) => {
    try {
        const { code, questionId, language, testCases } = req.body;

        // Validate input
        if (!code) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Code is required'
            });
        }

        if (!questionId) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Question ID is required'
            });
        }

        if (!language) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Language is required'
            });
        }

        // Find the question
        const question = await Question.findOne({
            $or: [
                { link: questionId },
                { link: `${questionId}/` }
            ]
        });

        if (!question) {
            return res.status(404).json({
                error: 'Question not found',
                message: 'The requested question could not be found in our database.'
            });
        }

        // Execute the code based on language
        let results = [];

        if (language === 'python') {
            // Import the Python code execution function
            const { runPythonCode } = await import('../utils/codeExecution.js');

            // Format test cases for execution
            const formattedTestCases = testCases.map(tc => {
                try {
                    // Try to parse as JSON if it's a string
                    if (typeof tc === 'string') {
                        return JSON.parse(tc);
                    }
                    return tc;
                } catch (e) {
                    // If parsing fails, use the string as input
                    return { input: tc, expectedOutput: '' };
                }
            });

            // Run the code
            results = await runPythonCode(code, formattedTestCases);
        } else {
            return res.status(400).json({
                error: 'Unsupported language',
                message: `Language ${language} is not supported yet`
            });
        }

        res.json({
            success: true,
            results
        });
    } catch (error) {
        console.error('Error executing code:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'An unexpected error occurred while executing the code.'
        });
    }
});

export default router; 