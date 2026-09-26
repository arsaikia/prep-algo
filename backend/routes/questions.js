import express from 'express';
import cacheMiddleware from '../middleware/cache.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

import {
    getQuestions,
    getQuestionById,
    submitCode,
    submitMcqAnswer,
    getAllQuestionsWithUserProgress
} from '../controller/questionController.js';
import { validate } from '../middleware/validate.js';
import { submitMcqSchema } from '../schemas/code.js';

router.get('/', cacheMiddleware, getQuestions);

router.get('/get-questions/:userId', protect, getAllQuestionsWithUserProgress);

router.get('/:questionId', cacheMiddleware, getQuestionById);

router.post('/:questionId/submit', protect, submitCode);

router.post('/:questionId/submit-mcq', protect, validate(submitMcqSchema), submitMcqAnswer);

export default router; 