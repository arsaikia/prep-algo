import SolveHistory from '../models/SolveHistory.js';
import UserProfile from '../models/UserProfile.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import { getItemByLegacyId, toQuestionSummary } from '../utils/contentStore.js';
import { invalidateUserCache } from '../middleware/cache.js';
import logger from '../config/logger.js';

/*
 * @desc     Get solve history for a user
 * @route    GET /api/v1/solveHistory/:userId
 * @access   Public
 */
const getSolveHistory = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const solveHistory = await SolveHistory.find({ userId }).lean();

    if (!solveHistory) {
        return next(new ErrorResponse(`No SolveHistory found!`, 404));
    }

    // `questionId` used to be populated with the whole question document,
    // hidden test cases and answer keys included. It is now the public
    // summary from the content catalog (null if the item no longer exists).
    const data = solveHistory.map((entry) => ({
        ...entry,
        questionId: toQuestionSummary(getItemByLegacyId(entry.questionId)),
    }));

    res.status(200).json({
        success: true,
        count: data.length,
        data,
    });
});

/*
 * @desc     Update solve history when user solves a question
 * @route    POST /api/v1/solveHistory
 * @access   Public
 */
const updateSolveHistory = asyncHandler(async (req, res, next) => {
    const {
        userId,
        questionId,
        timeSpent,
        difficultyRating,
        tags,
        success = true,
        sessionNumber = 1,
        previousQuestionResult,
        strategy
    } = req.body;

    if (!userId || !questionId) {
        return next(new ErrorResponse(`userId and questionId are required`, 400));
    }

    // Question metadata for analytics comes from the content catalog; the
    // id is the legacy id every problem and quiz carries.
    const item = getItemByLegacyId(questionId);
    if (!item) {
        return next(new ErrorResponse(`Question not found`, 404));
    }
    const question = { group: item.group, difficulty: item.difficulty, domain: item.domain };

    // Get or create user profile for adaptive recommendations
    let userProfile = await UserProfile.findByUserId(userId);
    if (!userProfile) {
        const existingHistory = await SolveHistory.find({ userId });
        userProfile = await UserProfile.createFromSolveHistory(userId, existingHistory);
        await userProfile.save();
    }

    const currentTimestamp = new Date();

    // Helper functions for session context
    const getTimeOfDay = () => {
        const hour = currentTimestamp.getHours();
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        return 'evening';
    };

    const getDayOfWeek = () => {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[currentTimestamp.getDay()];
    };

    // Check if solve history already exists for this user-question pair
    let response = await SolveHistory.findOne({ userId, questionId });

    if (response) {
        // Backfill denormalized fields if missing
        if (!response.questionGroup) response.questionGroup = question.group;
        if (!response.questionDifficulty) response.questionDifficulty = question.difficulty;
        if (!response.domain) response.domain = question.domain || 'algorithms';

        // Update existing record
        response.solveCount += 1;
        response.lastUpdatedAt = currentTimestamp;

        // Update average time to solve
        if (timeSpent) {
            const currentAverage = response.averageTimeToSolve || 0;
            const totalSessions = response.solveHistory.length;
            response.averageTimeToSolve = (currentAverage * totalSessions + timeSpent) / (totalSessions + 1);
        }

        // Update difficulty rating if provided
        if (difficultyRating) {
            response.difficulty_rating = difficultyRating;
        }

        // Add new tags if provided
        if (tags && Array.isArray(tags)) {
            tags.forEach(tag => {
                if (!response.tags.includes(tag)) {
                    response.tags.push(tag);
                }
            });
        }

        // Add to solve history array
        response.solveHistory.push({
            solvedAt: currentTimestamp,
            timeSpent: timeSpent || null,
            success: success,
            sessionContext: {
                timeOfDay: getTimeOfDay(),
                dayOfWeek: getDayOfWeek(),
                sessionNumber: sessionNumber,
                previousQuestionResult: previousQuestionResult,
                recommendationStrategy: strategy
            }
        });

        await response.save();
    } else {
        // Create new record
        response = await SolveHistory.create({
            userId,
            questionId,
            questionGroup: question.group,
            questionDifficulty: question.difficulty,
            domain: question.domain || 'algorithms',
            solveCount: 1,
            lastUpdatedAt: currentTimestamp,
            firstSolvedAt: currentTimestamp,
            averageTimeToSolve: timeSpent || null,
            difficulty_rating: difficultyRating || null,
            tags: tags || [],
            solveHistory: [{
                solvedAt: currentTimestamp,
                timeSpent: timeSpent || null,
                success: success,
                sessionContext: {
                    timeOfDay: getTimeOfDay(),
                    dayOfWeek: getDayOfWeek(),
                    sessionNumber: sessionNumber,
                    previousQuestionResult: previousQuestionResult,
                    recommendationStrategy: strategy
                }
            }]
        });
    }

    if (!response) {
        return next(new ErrorResponse(`SolveHistory update error`, 500));
    }

    // Update user profile with this solve session for adaptive recommendations
    if (userProfile) {
        try {
            userProfile.updateRecentPerformance({
                questionId,
                success,
                timeSpent: timeSpent || 15,
                difficulty: question.difficulty,
                strategy: strategy || 'general_practice'
            });
            await userProfile.save();
            logger.debug({ userId }, 'updated user profile for adaptive recommendations');
        } catch (profileError) {
            logger.error({ err: profileError }, 'error updating user profile');
            // Don't fail the main request if profile update fails
        }
    }

    invalidateUserCache(userId);
    res.status(201).json({ success: true, data: response });
});

export {
    getSolveHistory,
    updateSolveHistory,
};
