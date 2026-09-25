import express from 'express';
import cacheMiddleware from '../middleware/cache.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

import {
    getQuestions,
    getQuestionById,
    submitCode,
    getAllQuestionsWithUserProgress
} from '../controller/questionController.js';

router.get('/', cacheMiddleware, getQuestions);

router.get('/get-questions/:userId', protect, getAllQuestionsWithUserProgress);

router.get('/:questionId', cacheMiddleware, getQuestionById);

router.post('/:questionId/submit', protect, submitCode);

export default router; 