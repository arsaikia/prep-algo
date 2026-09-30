import express from 'express';
import { runPythonCode } from '../utils/codeExecution.js';
import { getGradingSpec, getItemBySlug } from '../utils/contentStore.js';
import logger from '../config/logger.js';
import { isQueueAvailable, getCodeExecutionQueue, getQueueEvents } from '../config/queue.js';
import { validate } from '../middleware/validate.js';
import { executeCodeSchema } from '../schemas/code.js';

const router = express.Router();

const JOB_TIMEOUT = 15000;

async function executeCode(code, testCases, questionTypes, log) {
    if (isQueueAvailable()) {
        log.debug('using BullMQ for code execution');
        const queue = getCodeExecutionQueue();
        const events = getQueueEvents();
        const job = await queue.add('execute', { code, testCases, questionTypes });
        const result = await job.waitUntilFinished(events, JOB_TIMEOUT);
        return result;
    }

    log.debug('BullMQ unavailable — direct execution');
    return runPythonCode(code, testCases, questionTypes);
}

router.post('/execute/example', validate(executeCodeSchema), async (req, res) => {
    try {
        const { code, questionId } = req.body;
        req.log.debug({ questionId, codeLength: code.length }, 'code execution request');

        // Examples are public content, read from the same built catalog the
        // CDN serves, so what runs is exactly what the learner was shown.
        const item = getItemBySlug(questionId);

        if (!item || item.type !== 'problem') return res.status(404).json({ error: 'Question not found' });
        if (!item.exampleTestCases || item.exampleTestCases.length === 0) {
            return res.status(400).json({ error: 'No example test cases available for this question' });
        }

        const results = await executeCode(code, item.exampleTestCases, item.types ?? null, req.log);

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
        res.status(500).json({ error: 'Failed to execute code' });
    }
});

router.post('/execute/submit', validate(executeCodeSchema), async (req, res) => {
    try {
        const { code, questionId } = req.body;

        const item = getItemBySlug(questionId);
        if (!item || item.type !== 'problem') return res.status(404).json({ error: 'Question not found' });

        const spec = getGradingSpec(item.slug);
        if (!spec) {
            return res.status(400).json({ error: 'No test cases available for this question' });
        }

        const results = await executeCode(code, spec.testCases, spec.types, req.log);
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
        res.status(500).json({ error: 'Failed to execute code' });
    }
});

export default router;
