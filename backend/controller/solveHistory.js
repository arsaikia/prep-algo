import SolveHistory from '../models/SolveHistory.js';
import UserProfile from '../models/UserProfile.js';
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
    const {
        userId,
        questionId,
        timeSpent, // in minutes
        difficultyRating, // 1-5 scale
        tags, // array of strings
        success = true, // boolean
        strategy, // which recommendation strategy suggested this question
        sessionNumber = 1, // question number in this session
        previousQuestionResult, // success of previous question in session
        feedbackOnly = false // NEW: if true, only update feedback fields without creating new solve session
    } = req.body;

    console.log('📊 updateSolveHistory received:', { userId, questionId, timeSpent, difficultyRating, tags, success, strategy, feedbackOnly });

    const question = await Question.findById(questionId);
    const user = await User.findById(userId);

    console.log('📊 Found question:', question ? question.name : 'null');
    console.log('📊 Found user:', user ? user.firstName : 'null');

    if (!user || !question) {
        return next(new Error(`Incorrect data to update solve history`, 400));
    }

    const lastSolve = await SolveHistory.findOne({ userId, questionId });

    // NEW: Get or create user profile for adaptive features
    let userProfile = await UserProfile.findByUserId(userId);
    if (!userProfile) {
        console.log('📊 Creating user profile for adaptive recommendations...');
        const existingHistory = await SolveHistory.find({ userId }).populate('questionId');
        userProfile = await UserProfile.createFromSolveHistory(userId, existingHistory);
        await userProfile.save();
    }

    let response;
    const currentTimestamp = new Date();

    if (lastSolve) {
        if (feedbackOnly) {
            // FEEDBACK-ONLY UPDATE: Only update feedback fields without creating new solve session
            console.log('📊 Feedback-only update for existing solve history');
            response = await SolveHistory.findByIdAndUpdate(
                lastSolve._id,
                {
                    lastUpdatedAt: currentTimestamp,
                    difficulty_rating: difficultyRating || lastSolve.difficulty_rating,
                    tags: tags || lastSolve.tags,
                    // Update strategy in the most recent solve session if it exists
                    ...(lastSolve.solveHistory?.length > 0 && {
                        'solveHistory.$[elem].sessionContext.recommendationStrategy': strategy
                    })
                },
                {
                    new: true,
                    arrayFilters: [{ 'elem.solvedAt': { $exists: true } }]
                }
            );
        } else {
            // REGULAR UPDATE: Create new solve session
            console.log('📊 Creating new solve session for existing question');

            // Calculate new average time if timeSpent is provided
            let newAverageTime = lastSolve.averageTimeToSolve;
            if (timeSpent && typeof timeSpent === 'number') {
                const totalSessions = lastSolve.solveHistory?.length || lastSolve.solveCount;
                const currentTotal = (lastSolve.averageTimeToSolve || 0) * totalSessions;
                newAverageTime = (currentTotal + timeSpent) / (totalSessions + 1);
            }

            // Prepare solve session data with adaptive context
            const newSolveSession = {
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
            };

            // Update existing record
            response = await SolveHistory.findByIdAndUpdate(
                lastSolve._id,
                {
                    solveCount: lastSolve.solveCount + 1,
                    lastUpdatedAt: currentTimestamp,
                    averageTimeToSolve: newAverageTime,
                    difficulty_rating: difficultyRating || lastSolve.difficulty_rating,
                    tags: tags || lastSolve.tags,
                    $push: { solveHistory: newSolveSession }
                },
                { new: true }
            );
        }
    } else {
        if (feedbackOnly) {
            // FEEDBACK-ONLY but no existing record - this shouldn't happen
            console.warn('📊 Warning: Feedback-only update requested but no existing solve history found');
            return next(new Error(`Cannot update feedback - no existing solve history found`, 404));
        }

        // Create new record
        console.log('📊 Creating new solve history record');
        response = await SolveHistory.create({
            userId,
            questionId,
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
        return next(new Error(`SolveHistory update error`, 500));
    }

    // NEW: Update user profile with this solve session for adaptive recommendations
    if (userProfile && !feedbackOnly) {
        // Only update user profile for actual solve sessions, not feedback-only updates
        try {
            userProfile.updateRecentPerformance({
                questionId,
                success,
                timeSpent: timeSpent || 15,
                difficulty: question.difficulty,
                strategy: strategy || 'general_practice'
            });
            await userProfile.save();
            console.log('📊 Updated user profile for adaptive recommendations');
        } catch (profileError) {
            console.error('📊 Error updating user profile:', profileError);
            // Don't fail the main request if profile update fails
        }
    } else if (feedbackOnly) {
        console.log('📊 Skipping user profile update for feedback-only request');
    }

    res.status(201).json({ success: true, data: response });
});

/*
 * @desc     Get daily practice recommendations for a user
 * @route    GET /api/v1/solveHistory/:userId/daily-recommendations
 * @access   Public
 */
const getDailyRecommendations = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const { count = 5 } = req.query; // Default to 5 recommendations

    // Get user's solve history
    const userHistory = await SolveHistory.find({ userId }).populate('questionId');

    if (!userHistory || userHistory.length === 0) {
        // New user - return beginner-friendly questions
        const beginnerQuestions = await Question.find({
            difficulty: 'Easy',
            list: { $in: ['TOP 150'] }
        }).limit(parseInt(count));

        return res.status(200).json({
            success: true,
            data: {
                recommendations: beginnerQuestions.map(q => ({
                    question: q,
                    reason: 'Beginner-friendly question',
                    priority: 'high'
                })),
                strategy: 'beginner'
            }
        });
    }

    // Analyze user patterns
    const analysis = await analyzeUserPatterns(userId, userHistory);

    // Generate recommendations using multiple strategies
    const recommendations = await generateRecommendations(userId, analysis, parseInt(count));

    res.status(200).json({
        success: true,
        data: {
            recommendations,
            analysis,
            totalSolved: userHistory.length
        }
    });
});

// Helper function to analyze user patterns
const analyzeUserPatterns = async (userId, userHistory) => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Group analysis
    const groupStats = {};
    const difficultyStats = { Easy: 0, Medium: 0, Hard: 0 };
    const recentActivity = [];
    const strugglingQuestions = [];

    userHistory.forEach(history => {
        const question = history.questionId;
        if (!question) return;

        // Group preferences
        if (!groupStats[question.group]) {
            groupStats[question.group] = { count: 0, avgSolveCount: 0 };
        }
        groupStats[question.group].count++;
        groupStats[question.group].avgSolveCount += history.solveCount;

        // Difficulty distribution
        difficultyStats[question.difficulty]++;

        // Recent activity (last week)
        if (history.lastUpdatedAt >= oneWeekAgo) {
            recentActivity.push(history);
        }

        // Struggling questions (solved multiple times recently)
        if (history.solveCount > 2 && history.lastUpdatedAt >= oneMonthAgo) {
            strugglingQuestions.push({
                question,
                solveCount: history.solveCount,
                lastSolved: history.lastUpdatedAt
            });
        }
    });

    // Calculate averages
    Object.keys(groupStats).forEach(group => {
        groupStats[group].avgSolveCount =
            groupStats[group].avgSolveCount / groupStats[group].count;
    });

    // Determine user level
    const totalSolved = userHistory.length;
    const hardPercentage = (difficultyStats.Hard / totalSolved) * 100;
    const mediumPercentage = (difficultyStats.Medium / totalSolved) * 100;

    let userLevel = 'beginner';
    if (totalSolved > 50 && hardPercentage > 20) {
        userLevel = 'advanced';
    } else if (totalSolved > 20 && mediumPercentage > 40) {
        userLevel = 'intermediate';
    }

    // Find weak areas (groups with low solve count or high retry rate)
    const weakAreas = Object.entries(groupStats)
        .filter(([group, stats]) => stats.count < 3 || stats.avgSolveCount > 2)
        .map(([group]) => group);

    // Find strong areas
    const strongAreas = Object.entries(groupStats)
        .filter(([group, stats]) => stats.count >= 5 && stats.avgSolveCount <= 1.5)
        .map(([group]) => group);

    return {
        groupStats,
        difficultyStats,
        userLevel,
        weakAreas,
        strongAreas,
        recentActivity: recentActivity.length,
        strugglingQuestions,
        totalSolved
    };
};

// Helper function to generate recommendations
const generateRecommendations = async (userId, analysis, count) => {
    const recommendations = [];
    const solvedQuestionIds = await SolveHistory.find({ userId }).distinct('questionId');

    // Strategy 1: Reinforce weak areas (40% of recommendations)
    const weakAreaCount = Math.ceil(count * 0.4);
    if (analysis.weakAreas.length > 0) {
        const weakAreaQuestions = await Question.find({
            _id: { $nin: solvedQuestionIds },
            group: { $in: analysis.weakAreas },
            difficulty: getDifficultyForLevel(analysis.userLevel)
        }).limit(weakAreaCount);

        weakAreaQuestions.forEach(question => {
            recommendations.push({
                question,
                reason: `Strengthen weak area: ${question.group}`,
                priority: 'high',
                strategy: 'weak_area_reinforcement'
            });
        });
    }

    // Strategy 2: Progressive difficulty (30% of recommendations)
    const progressiveCount = Math.ceil(count * 0.3);
    const nextDifficulty = getNextDifficulty(analysis.userLevel, analysis.difficultyStats);
    if (nextDifficulty) {
        const progressiveQuestions = await Question.find({
            _id: { $nin: solvedQuestionIds },
            difficulty: nextDifficulty,
            list: { $in: ['TOP 150'] }
        }).limit(progressiveCount);

        progressiveQuestions.forEach(question => {
            recommendations.push({
                question,
                reason: `Progressive difficulty: ${nextDifficulty}`,
                priority: 'medium',
                strategy: 'progressive_difficulty'
            });
        });
    }

    // Strategy 3: Spaced repetition for struggling questions (20% of recommendations)
    const repetitionCount = Math.ceil(count * 0.2);
    if (analysis.strugglingQuestions.length > 0) {
        // Sort by last solved date and solve count
        const needsReview = analysis.strugglingQuestions
            .sort((a, b) => b.solveCount - a.solveCount)
            .slice(0, repetitionCount);

        needsReview.forEach(item => {
            recommendations.push({
                question: item.question,
                reason: `Review: Solved ${item.solveCount} times`,
                priority: 'high',
                strategy: 'spaced_repetition',
                lastSolved: item.lastSolved
            });
        });
    }

    // Strategy 4: Explore new topics (10% of recommendations)
    const remainingCount = count - recommendations.length;
    if (remainingCount > 0) {
        const allGroups = await Question.distinct('group');
        const unexploredGroups = allGroups.filter(group =>
            !analysis.groupStats[group] || analysis.groupStats[group].count < 2
        );

        if (unexploredGroups.length > 0) {
            const explorationQuestions = await Question.find({
                _id: { $nin: solvedQuestionIds },
                group: { $in: unexploredGroups },
                difficulty: 'Easy',
                list: { $in: ['TOP 150'] }
            }).limit(remainingCount);

            explorationQuestions.forEach(question => {
                recommendations.push({
                    question,
                    reason: `Explore new topic: ${question.group}`,
                    priority: 'low',
                    strategy: 'topic_exploration'
                });
            });
        }
    }

    // Fill remaining slots with random quality questions if needed
    const finalCount = count - recommendations.length;
    if (finalCount > 0) {
        const fillerQuestions = await Question.find({
            _id: { $nin: solvedQuestionIds },
            list: { $in: ['TOP 150'] },
            difficulty: getDifficultyForLevel(analysis.userLevel)
        }).limit(finalCount);

        fillerQuestions.forEach(question => {
            recommendations.push({
                question,
                reason: 'Quality practice question',
                priority: 'medium',
                strategy: 'general_practice'
            });
        });
    }

    // Sort by priority and return top count
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return recommendations
        .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
        .slice(0, count);
};

// Helper functions
const getDifficultyForLevel = (userLevel) => {
    switch (userLevel) {
        case 'beginner': return { $in: ['Easy'] };
        case 'intermediate': return { $in: ['Easy', 'Medium'] };
        case 'advanced': return { $in: ['Medium', 'Hard'] };
        default: return { $in: ['Easy'] };
    }
};

const getNextDifficulty = (userLevel, difficultyStats) => {
    const total = difficultyStats.Easy + difficultyStats.Medium + difficultyStats.Hard;
    const easyPercentage = (difficultyStats.Easy / total) * 100;
    const mediumPercentage = (difficultyStats.Medium / total) * 100;

    if (userLevel === 'beginner' && easyPercentage > 70) {
        return 'Medium';
    } else if (userLevel === 'intermediate' && mediumPercentage > 60) {
        return 'Hard';
    }
    return null;
};

// Helper functions for session context
const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'evening';
};

const getDayOfWeek = () => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
};

export {
    getSolveHistory,
    updateSolveHistory,
    getDailyRecommendations,
};
