import express from 'express';
import {
    getSmartDailyRecommendations,
    markQuestionCompleted
} from '../controller/smartRecommendations.js';

const router = express.Router();

// Smart daily recommendations with hybrid caching
router.get('/:userId/daily', getSmartDailyRecommendations);

// Mark question as completed in daily batch
router.post('/:userId/complete', markQuestionCompleted);

export default router; 