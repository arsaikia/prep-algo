import express from 'express';
import {
    getSmartDailyRecommendations,
    markQuestionCompleted,
    forceRefreshRecommendations,
    replaceCompletedQuestions
} from '../controller/smartRecommendations.js';

const router = express.Router();

// Smart daily recommendations with hybrid caching
router.get('/:userId/daily', getSmartDailyRecommendations);

// Mark question as completed in daily batch
router.post('/:userId/complete', markQuestionCompleted);

// Replace completed questions with fresh ones (keep incomplete)
router.post('/:userId/replace-completed', replaceCompletedQuestions);

// Force refresh all recommendations (legacy)
router.post('/:userId/refresh', forceRefreshRecommendations);

export default router; 