import express from 'express';
const router = express.Router();

import {
    getAdaptiveDailyRecommendations,
    updateAdaptiveProfile
} from '../controller/adaptiveRecommendations.js';

// Get adaptive daily recommendations for a user
router.route('/:userId/daily').get(getAdaptiveDailyRecommendations);

// Update user profile after solving a question
router.route('/:userId/update').post(updateAdaptiveProfile);

export default router; 