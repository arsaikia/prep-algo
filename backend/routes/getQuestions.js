import express from 'express';
const router = express.Router();

import {
    getQuestions,
} from '../controller/getQuestions.js';

// Get all questions without solve history (lazy loading)
router.route('/').get(getQuestions);


// Export the router
export { router as getQuestions };
