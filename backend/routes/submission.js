import express from 'express';
import Question from '../models/Question.js';
import logger from '../config/logger.js';
import { validate } from '../middleware/validate.js';
import { updateTestCasesSchema, updateTemplatesSchema, updateQuestionSchema, submitCodeSchema } from '../schemas/code.js';

const router = express.Router();

router.put('/question/:questionId/test-cases', validate(updateTestCasesSchema), async (req, res) => {
    try {
        const { questionId } = req.params;
        const { exampleTestCases, testCases } = req.body;

        const question = await Question.findOne({
            $or: [{ link: questionId }, { link: `${questionId}/` }]
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const updateData = {};
        if (exampleTestCases) updateData.exampleTestCases = exampleTestCases;
        if (testCases) updateData.testCases = testCases;

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
        logger.error({ err: error }, 'error updating test cases');
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/question/:questionId/templates', validate(updateTemplatesSchema), async (req, res) => {
    try {
        const { questionId } = req.params;
        const { templates } = req.body;

        const question = await Question.findOne({
            $or: [{ link: questionId }, { link: `${questionId}/` }]
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const updatedQuestion = await Question.findByIdAndUpdate(
            question._id,
            { $set: { templates: { ...question.templates, ...templates } } },
            { new: true }
        );

        res.json({
            success: true,
            data: { id: updatedQuestion._id, templates: updatedQuestion.templates }
        });
    } catch (error) {
        logger.error({ err: error }, 'error updating templates');
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/question/:questionId', validate(updateQuestionSchema), async (req, res) => {
    try {
        const { questionId } = req.params;

        const question = await Question.findOne({
            $or: [{ link: questionId }, { link: `${questionId}/` }]
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const updatedQuestion = await Question.findByIdAndUpdate(
            question._id,
            { $set: req.body },
            { new: true }
        );

        res.json({ success: true, data: updatedQuestion });
    } catch (error) {
        logger.error({ err: error }, 'error updating question');
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/submit', validate(submitCodeSchema), async (req, res) => {
    try {
        const { code, questionId, language, testCases } = req.body;

        const question = await Question.findOne({
            $or: [{ link: questionId }, { link: `${questionId}/` }]
        }).select('_id name description difficulty group exampleTestCases testCases templates types');

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        if (language !== 'python') {
            return res.status(400).json({ error: `Language ${language} is not supported yet` });
        }

        const { runPythonCode } = await import('../utils/codeExecution.js');

        const formattedTestCases = (testCases || []).map(tc => {
            if (typeof tc === 'string') {
                try { return JSON.parse(tc); } catch { return { inputs: [tc], expectedOutput: '' }; }
            }
            return tc;
        });

        const results = await runPythonCode(code, formattedTestCases, question.types);
        const passedTests = results.filter(r => r.passed).length;

        res.json({
            success: true,
            results,
            passedTests,
            totalTests: results.length,
            score: (passedTests / results.length) * 100
        });
    } catch (error) {
        logger.error({ err: error }, 'error executing code');
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
