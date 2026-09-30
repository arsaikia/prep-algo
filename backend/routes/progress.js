import express from 'express';

import { getProgress } from '../controller/progress.js';
import { protect } from '../middleware/auth.js';
import { requireSelf } from '../middleware/ownership.js';

const router = express.Router();

router.get('/:userId', protect, requireSelf(), getProgress);

export default router;
