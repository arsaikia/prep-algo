import express from 'express';
import {
    getSmartDailyRecommendations,
    markQuestionCompleted,
    forceRefreshRecommendations,
    replaceCompletedQuestions,
    trackRecommendationAction
} from '../controller/smartRecommendations.js';

const router = express.Router();

router.get('/:userId/daily', getSmartDailyRecommendations);
router.post('/:userId/complete', markQuestionCompleted);
router.post('/:userId/replace-completed', replaceCompletedQuestions);
router.post('/:userId/refresh', forceRefreshRecommendations);
router.post('/:userId/track', trackRecommendationAction);

export default router; 