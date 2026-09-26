import express from 'express';
import { requireSelf } from '../middleware/ownership.js';
import {
    getSmartDailyRecommendations,
    markQuestionCompleted,
    forceRefreshRecommendations,
    replaceCompletedQuestions,
    trackRecommendationAction
} from '../controller/smartRecommendations.js';

const router = express.Router();

// Every route below is scoped to :userId — callers may only address themselves.
router.use('/:userId', requireSelf());

router.get('/:userId/daily', getSmartDailyRecommendations);
router.post('/:userId/complete', markQuestionCompleted);
router.post('/:userId/replace-completed', replaceCompletedQuestions);
router.post('/:userId/refresh', forceRefreshRecommendations);
router.post('/:userId/track', trackRecommendationAction);

export default router; 