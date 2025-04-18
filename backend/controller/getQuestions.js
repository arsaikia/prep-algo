import Question from '../models/Question.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../middleware/error.js';
import { v4 as uuid } from 'uuid';
import SolveHistory from '../models/SolveHistory.js';

/*
 * @desc     Get All Questions (without solve history)
 * @route    GET /api/v1/questions
 * @access   Public
 */

const getQuestions = asyncHandler(async (req, res, next) => {
    // Get all questions without any filters
    const questions = await Question.find()
        .select('_id name link group difficulty list order')
        .sort({ order: 1 });

    return res.status(200).json({
        success: true,
        count: questions.length,
        data: questions
    });
});

export {
    getQuestions,
};
