import express from 'express';
const router = express.Router();

import {
    getQuestions,
    addQuestion,
    updateSolveCount,
    getAllQuestions,
} from '../controller/all.js';

// Get all questions without solve history (lazy loading)
router.route('/all').get(getAllQuestions);

// Get questions with solve history for a specific user
router.route('/:userId').get(getQuestions);

// Add a new question
router.route('/').post(addQuestion);

// Update solve count for a question
router.route('/updatesolvecount').post(updateSolveCount);

// Export the router
export { router as allQuestions };
