import express from 'express';
const router = express.Router();

import {
    getSolveHistory,
    updateSolveHistory,
} from '../controller/solveHistory.js';
import { validate } from '../middleware/validate.js';
import { solveHistorySchema } from '../schemas/code.js';
import { requireSelf } from '../middleware/ownership.js';

router.route('/').post(validate(solveHistorySchema), requireSelf('body'), updateSolveHistory);
router.route('/:userId').get(requireSelf(), getSolveHistory);

// Export the router
export { router as solveHistory };
