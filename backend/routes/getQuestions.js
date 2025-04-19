import express from 'express';
import cacheMiddleware from '../middleware/cache.js';

const router = express.Router();

import {
    getQuestions,
} from '../controller/getQuestions.js';

// Apply cache middleware only to GET routes
router.get('/', (req, res, next) => {
    console.log('Route: GET /api/v1/questions/');
    next();
}, cacheMiddleware, getQuestions);

// Export the router
export { router as getQuestions };
