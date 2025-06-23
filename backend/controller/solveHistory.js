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
    const solveHistory = await SolveHistory.find({ userId }).populate('questionId');

    if (!solveHistory) {
        return next(new ErrorResponse(`No SolveHistory found!`, 404));
    }
    res.status(200).json({
        success: true,
        count: solveHistory.length,
        data: solveHistory,
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
        return next(new Error(`userId and questionId are required`, 400));
    }

    // Get question details for analytics
    const question = await Question.findById(questionId);
    if (!question) {
        return next(new Error(`Question not found`, 404));
    }

    // Get or create user profile for adaptive recommendations
    let userProfile = await UserProfile.findByUserId(userId);
    if (!userProfile) {
        const existingHistory = await SolveHistory.find({ userId }).populate('questionId');
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
            console.log('📊 Updated user profile for adaptive recommendations');
        } catch (profileError) {
            console.error('📊 Error updating user profile:', profileError);
            // Don't fail the main request if profile update fails
        }
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

// Helper function to determine difficulty for user level
const getDifficultyForLevel = (userLevel) => {
    switch (userLevel) {
        case 'beginner': return 'Easy';
        case 'intermediate': return 'Medium';
        case 'advanced': return 'Hard';
        default: return 'Easy';
    }
};

// Helper function to get next difficulty level
const getNextDifficulty = (userLevel, difficultyStats) => {
    const total = difficultyStats.Easy + difficultyStats.Medium + difficultyStats.Hard;
    const easyPercentage = (difficultyStats.Easy / total) * 100;
    const mediumPercentage = (difficultyStats.Medium / total) * 100;

    if (userLevel === 'beginner' && easyPercentage > 70) {
        return 'Medium';
    } else if (userLevel === 'intermediate' && mediumPercentage > 60) {
        return 'Hard';
    }
    return getDifficultyForLevel(userLevel);
};

export {
    getSolveHistory,
    updateSolveHistory,
    getDailyRecommendations,
};
