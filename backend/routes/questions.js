import express from 'express';
import cacheMiddleware from '../middleware/cache.js';

const router = express.Router();

import {
    getQuestions,
    getQuestionById,
    submitCode,
    getAllQuestionsWithUserProgress
} from '../controller/questionController.js';

// Apply cache middleware to GET routes
router.get('/', (req, res, next) => {
    console.log('Route: GET /api/v1/questions/');
    next();
}, cacheMiddleware, getQuestions);

// Get questions with user progress
router.get('/get-questions/:userId', (req, res, next) => {
    console.log(`Route: GET /api/v1/questions/get-questions/${req.params.userId}`);
    next();
}, getAllQuestionsWithUserProgress);

// Get question by ID
router.get('/:questionId', (req, res, next) => {
    console.log(`Route: GET /api/v1/questions/${req.params.questionId}`);
    next();
}, cacheMiddleware, getQuestionById);

// Submit code for a question
router.post('/:questionId/submit', submitCode);

export default router; 