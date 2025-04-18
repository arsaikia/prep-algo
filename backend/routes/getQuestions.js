import express from 'express';
import cacheMiddleware from '../middleware/cache.js';

const router = express.Router();

import {
    getQuestions,
} from '../controller/getQuestions.js';

// Apply cache middleware to all routes in this router
router.use(cacheMiddleware);

// Get all questions without solve history (lazy loading)
router.route('/').get(getQuestions);

// Export the router
export { router as getQuestions };
