import Question from '../models/Question.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../middleware/error.js';
import { v4 as uuid } from 'uuid';
import SolveHistory from '../models/SolveHistory.js';

/*
 * @desc     Get All Questions (without solve history)
 * @route    GET /api/v1/questions/all
 * @access   Public
 */

const getAllQuestions = asyncHandler(async (req, res, next) => {
    // Get all questions without any filters, using lean for better performance
    const questions = await Question.find()
        .select('_id name link group difficulty list order')
        .lean()
        .sort({ order: 1 });

    return res.status(200).json({
        success: true,
        count: questions.length,
        data: questions
    });
});

/*
 * @desc     Get All Questions with Solve History
 * @route    GET /api/v1/questions/?userId
 * @access   Public
 */

const getQuestions = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    // Use aggregation pipeline with optimized stages
    const pipeline = [
        {
            $lookup: {
                from: 'solvehistories',
                let: { questionId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$questionId', '$$questionId'] },
                                    ...(userId !== 'guest' ? [{ $eq: ['$userId', userId] }] : [])
                                ]
                            }
                        }
                    },
                    { $limit: 1 }
                ],
                as: 'solveHistory'
            }
        },
        {
            $addFields: {
                solveCount: {
                    $cond: {
                        if: { $size: '$solveHistory' },
                        then: { $arrayElemAt: ['$solveHistory.solveCount', 0] },
                        else: 0
                    }
                },
                lastUpdatedAt: {
                    $cond: {
                        if: { $size: '$solveHistory' },
                        then: {
                            $substr: [
                                { $arrayElemAt: ['$solveHistory.lastUpdatedAt', 0] },
                                4,
                                11
                            ]
                        },
                        else: 'Unsolved'
                    }
                }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                link: 1,
                group: 1,
                list: 1,
                difficulty: 1,
                solveCount: 1,
                lastUpdatedAt: 1,
                userId: { $literal: userId }
            }
        }
    ];

    const questionsWithSolveCount = await Question.aggregate(pipeline)
        .hint({ _id: 1 })
        .allowDiskUse(true);

    return res.status(200).json({
        success: true,
        data: questionsWithSolveCount
    });
});

/*
 * @desc     Add a question
 * @route    POST /api/v1/question
 * @access   Public
 */

const addQuestion = asyncHandler(async (req, res, next) => {
    const question = await Question.create(req.body);

    res.status(201).json({
        success: true,
        data: question,
    });
});

/*
 * @desc     mark a question as complete
 * @route    POST /api/v1/question
 * @access   Public
 */

const updateSolveCount = asyncHandler(async (req, res, next) => {
    const oldQuestion = await Question.findById(req.query.id);
    const question = await Question.findByIdAndUpdate(
        req.query.id,
        {
            solveCount: oldQuestion.solveCount + 1,
            lastUpdatedAt: new Date(),
        },
        {
            new: true
        }
    );

    if (!question) {
        return next(new ErrorResponse(`Data Insertion Error!`, 500));
    }
    res.status(201).json({ success: true, data: question });
});

export {
    getQuestions,
    addQuestion,
    updateSolveCount,
    getAllQuestions,
};
