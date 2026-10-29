import express from 'express';
import cacheMiddleware from '../middleware/cache.js';
import { protect } from '../middleware/auth.js';
import { requireSelf } from '../middleware/ownership.js';

const router = express.Router();

import {
    getQuestions,
    getQuestionById,
    submitCode,
    submitMcqAnswer,
    getAllQuestionsWithUserProgress
} from '../controller/questionController.js';
import { validate } from '../middleware/validate.js';
import { gradeCodeSchema, submitMcqSchema } from '../schemas/code.js';
import { codeExecutionLimiter } from '../middleware/rateLimiter/index.js';

router.get('/', cacheMiddleware, getQuestions);

router.get('/get-questions/:userId', protect, requireSelf(), getAllQuestionsWithUserProgress);

router.get('/:questionId', cacheMiddleware, getQuestionById);

router.post('/:questionId/submit', protect, codeExecutionLimiter, validate(gradeCodeSchema), submitCode);

router.post('/:questionId/submit-mcq', protect, validate(submitMcqSchema), submitMcqAnswer);

export default router; 