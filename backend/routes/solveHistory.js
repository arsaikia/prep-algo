import express from 'express';
const router = express.Router();

import {
    getSolveHistory,
    updateSolveHistory,
    getDailyRecommendations,
} from '../controller/solveHistory.js';

router.route('/').post(updateSolveHistory);
router.route('/:userId').get(getSolveHistory);
router.route('/:userId/daily-recommendations').get(getDailyRecommendations);

// Export the router
export { router as solveHistory };
