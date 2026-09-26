import express from 'express';
const router = express.Router();

import {
    getSolveHistory,
    updateSolveHistory,
} from '../controller/solveHistory.js';
import { validate } from '../middleware/validate.js';
import { solveHistorySchema } from '../schemas/code.js';

router.route('/').post(validate(solveHistorySchema), updateSolveHistory);
router.route('/:userId').get(getSolveHistory);

// Export the router
export { router as solveHistory };
