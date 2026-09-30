import express from 'express';
import logger from '../config/logger.js';
import { validate } from '../middleware/validate.js';
import { submitCodeSchema } from '../schemas/code.js';
import { authorize } from '../middleware/auth.js';
import { getGradingSpec, redactHiddenResults } from '../utils/contentStore.js';

const router = express.Router();

// Question content (descriptions, templates, test cases) is built from the
// repository's content/ directory by the content build, which emits the
// server grading bundle. Mutating the database copy no longer affects grading or
// the published content, so these endpoints are retired rather than left as
// silent no-ops.
const contentIsReadOnly = (_req, res) => res.status(410).json({
    error: 'Question content is managed by the content pipeline',
    detail: 'Edit the problem JSON under content/ and run npm run build:content.'
});

router.put('/question/:questionId/test-cases', authorize('admin'), contentIsReadOnly);
router.put('/question/:questionId/templates', authorize('admin'), contentIsReadOnly);
router.put('/question/:questionId', authorize('admin'), contentIsReadOnly);

router.post('/submit', validate(submitCodeSchema), async (req, res) => {
    try {
        const { code, questionId, language } = req.body;

        if (language !== 'python') {
            return res.status(400).json({ error: `Language ${language} is not supported yet` });
        }

        const spec = getGradingSpec(questionId);

        if (!spec) {
            return res.status(404).json({ error: 'No graded test cases are available for this question' });
        }

        const { runPythonCode } = await import('../utils/codeExecution.js');

        const results = await runPythonCode(code, spec.testCases, spec.types);
        const passedTests = results.filter(r => r.passed).length;
        const totalTests = results.length;

        res.json({
            success: true,
            results: redactHiddenResults(results, spec.testCases),
            passedTests,
            totalTests,
            score: totalTests > 0 ? (passedTests / totalTests) * 100 : 0
        });
    } catch (error) {
        logger.error({ err: error }, 'error executing code');
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
