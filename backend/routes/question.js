import express from 'express';
import { submitCode } from '../controller/questionController.js';

const router = express.Router();

// @route   POST /api/v1/questions/:questionId/submit
// @desc    Submit code for a question
// @access  Public
router.post('/:questionId/submit', submitCode);

export default router; 