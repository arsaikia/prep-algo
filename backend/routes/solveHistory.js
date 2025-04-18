import express from 'express';
const router = express.Router();

import {
    getSolveHistory,
    updateSolveHistory,
} from '../controller/solveHistory.js';

router.route('/').post(updateSolveHistory);
router.route('/:userId').get(getSolveHistory);

// Export the router
export { router as solveHistory };
