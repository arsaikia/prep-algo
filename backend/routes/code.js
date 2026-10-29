import express from 'express';
import { runPythonCode } from '../utils/codeExecution.js';
import { getGradingSpec, getItemBySlug, assertContentRevision } from '../utils/contentStore.js';
import { requestExecutionSignal } from '../utils/executionBudget.js';
import { validate } from '../middleware/validate.js';
import { executeCodeSchema } from '../schemas/code.js';

const router = express.Router();

router.post('/execute/example', validate(executeCodeSchema), async (req, res, next) => {
    try {
        const { code, questionId } = req.body;
        req.log.debug({ questionId, codeLength: code.length }, 'code execution request');

        // Examples are public content, read from the same built catalog the
        // CDN serves, so what runs is exactly what the learner was shown.
        const item = getItemBySlug(questionId);

        if (!item || item.type !== 'problem') return res.status(404).json({ error: 'Question not found' });
        assertContentRevision(item, req.body.contentRevision);
        if (!item.exampleTestCases || item.exampleTestCases.length === 0) {
            return res.status(400).json({ error: 'No example test cases available for this question' });
        }

        const results = await runPythonCode(code, item.exampleTestCases, item.types ?? null, {
            signal: requestExecutionSignal(req, res),
        });

        res.json({
            results,
            summary: {
                total: results.length,
                passed: results.filter(r => r.passed).length,
                failed: results.filter(r => !r.passed).length
            }
        });
    } catch (error) {
        req.log.error({ err: error }, 'error executing code');
        next(error);
    }
});

router.post('/execute/submit', validate(executeCodeSchema), async (req, res, next) => {
    try {
        const { code, questionId } = req.body;

        const item = getItemBySlug(questionId);
        if (!item || item.type !== 'problem') return res.status(404).json({ error: 'Question not found' });
        assertContentRevision(item, req.body.contentRevision);

        const spec = getGradingSpec(item.slug);
        if (!spec) {
            return res.status(400).json({ error: 'No test cases available for this question' });
        }

        const results = await runPythonCode(code, spec.testCases, spec.types, {
            signal: requestExecutionSignal(req, res),
        });
        const passed = results.every(r => r.passed);

        res.json({
            passed,
            summary: {
                total: results.length,
                passed: results.filter(r => r.passed).length,
                failed: results.filter(r => !r.passed).length
            }
        });
    } catch (error) {
        req.log.error({ err: error }, 'error executing code');
        next(error);
    }
});

export default router;
