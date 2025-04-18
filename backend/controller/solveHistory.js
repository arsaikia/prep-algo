import SolveHistory from '../models/SolveHistory.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../middleware/error.js';
import { v4 as uuid } from 'uuid';
import Question from '../models/Question.js';
import User from '../models/User.js';

/*
 * @desc     Get solve history for a user
 * @route    GET /api/v1/solveHistory/:userId
 * @access   Public
 */

const getSolveHistory = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const solveHistory = await SolveHistory.find({ userId });

    if (!solveHistory) {
        return next(new ErrorResponse(`No SolveHistory found!`, 404));
    }
    res.status(200).json({ success: true, data: solveHistory });
});

/*
 * @desc     updateSolveHistory
 * @route    POST /api/v1/question
 * @access   Public
 */

const updateSolveHistory = asyncHandler(async (req, res, next) => {
    const { userId, questionId } = req.body;

    const question = await Question.findById({ _id: questionId });
    const user = await User.findById({ _id: userId });

    if (!user || !question) {
        return next(new Error(`Incorrect data to update solve history`, 400));
    }

    const lastSolve = await SolveHistory.findOne({ userId, questionId});
    // res.status(201).json({ success: true, data: lastSolve });

    let response;
    const currentTimestamp = new Date();
    if (lastSolve) {
        response = await SolveHistory.findByIdAndUpdate(
            lastSolve._id,
            {
                solveCount: lastSolve.solveCount + 1,
                lastUpdatedAt: currentTimestamp,
            },
            {
                new: true
            }
        )
    } else {
        response = await SolveHistory.create(
            {
                userId,
                questionId,
                solveCount: 1,
                lastUpdatedAt: currentTimestamp,
            }
        );
    }

    if (!response) {
        return next(new Error(`SolveHistory update error`, 500));
    }
    res.status(201).json({ success: true, data: response });
});

export {
    getSolveHistory,
    updateSolveHistory,
};
