import SolveHistory from '../models/SolveHistory.js';
import UserProfile from '../models/UserProfile.js';
import Question from '../models/Question.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../middleware/error.js';

/*
 * @desc     Get adaptive daily recommendations for a user
 * @route    GET /api/v1/adaptive-recommendations/:userId/daily
 * @access   Public
 */
const getAdaptiveDailyRecommendations = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const { count = 5 } = req.query;

    console.log(`🧠 Getting adaptive recommendations for user: ${userId}`);

    // Get or create user profile
    let userProfile = await UserProfile.findByUserId(userId);

    if (!userProfile) {
        console.log('📊 Creating new user profile from solve history...');
        const existingHistory = await SolveHistory.find({ userId }).populate('questionId');
        userProfile = await UserProfile.createFromSolveHistory(userId, existingHistory);
        await userProfile.save();
    }

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
                    reason: 'Beginner-friendly question to get started',
                    priority: 'high',
                    strategy: 'general_practice'
                })),
                strategy: 'beginner',
                adaptiveFeatures: {
                    enabled: false,
                    reason: 'No solve history - need at least 1 question solved'
                }
            }
        });
    }

    // Check if user has minimal data for basic adaptive features (3+ questions)
    const hasMinimalData = userHistory.length >= 3;
    const hasRichData = userHistory.length >= 20;

    // Analyze user patterns with adaptive enhancements
    const analysis = await analyzeUserPatternsAdaptive(userId, userHistory, userProfile);

    // Update user profile with latest analysis
    await updateUserProfileFromAnalysis(userProfile, analysis);

    // Generate adaptive recommendations
    const recommendations = await generateAdaptiveRecommendations(
        userId,
        analysis,
        userProfile,
        parseInt(count)
    );

    // Check if we should adjust strategy weights (only for users with rich data)
    if (hasRichData && userProfile.shouldAdjustWeights()) {
        await adjustStrategyWeights(userProfile, analysis);
    }

    // Save updated profile
    await userProfile.save();

    res.status(200).json({
        success: true,
        data: {
            recommendations,
            analysis: {
                ...analysis,
                adaptiveWeights: userProfile.getAdaptiveWeights(),
                recentPerformance: userProfile.recentPerformance,
                timePreferences: userProfile.timePreferences,
                adaptiveFeatures: {
                    enabled: hasMinimalData,
                    level: hasRichData ? 'full' : 'basic',
                    version: userProfile.adaptationMetadata.version,
                    lastAdjustment: userProfile.adaptationMetadata.lastWeightAdjustment,
                    dataPoints: userHistory.length,
                    reason: hasMinimalData ?
                        (hasRichData ? 'Full adaptive features available' : 'Basic adaptive features available') :
                        'Need at least 3 questions solved for adaptive features'
                }
            },
            totalSolved: userHistory.length
        }
    });
});

// Enhanced pattern analysis with adaptive features
const analyzeUserPatternsAdaptive = async (userId, userHistory, userProfile) => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Standard analysis (same as before)
    const groupStats = {};
    const difficultyStats = { Easy: 0, Medium: 0, Hard: 0 };
    const recentActivity = [];
    const strugglingQuestions = [];

    // NEW: Time-based performance analysis
    const timeBasedPerformance = {
        morning: { attempts: 0, successes: 0, totalTime: 0 },
        afternoon: { attempts: 0, successes: 0, totalTime: 0 },
        evening: { attempts: 0, successes: 0, totalTime: 0 }
    };

    // NEW: Strategy effectiveness tracking
    const strategyPerformance = {
        weak_area_reinforcement: { attempts: 0, successes: 0 },
        progressive_difficulty: { attempts: 0, successes: 0 },
        spaced_repetition: { attempts: 0, successes: 0 },
        topic_exploration: { attempts: 0, successes: 0 },
        general_practice: { attempts: 0, successes: 0 }
    };

    userHistory.forEach(history => {
        const question = history.questionId;
        if (!question) return;

        // Standard group and difficulty analysis
        if (!groupStats[question.group]) {
            groupStats[question.group] = { count: 0, avgSolveCount: 0 };
        }
        groupStats[question.group].count++;
        groupStats[question.group].avgSolveCount += history.solveCount;
        difficultyStats[question.difficulty]++;

        // Recent activity
        if (history.lastUpdatedAt >= oneWeekAgo) {
            recentActivity.push(history);
        }

        // Struggling questions
        if (history.solveCount > 2 && history.lastUpdatedAt >= oneMonthAgo) {
            strugglingQuestions.push({
                question,
                solveCount: history.solveCount,
                lastSolved: history.lastUpdatedAt
            });
        }

        // NEW: Analyze solve sessions for time-based patterns
        history.solveHistory.forEach(session => {
            const timeOfDay = session.sessionContext?.timeOfDay || 'evening';
            const strategy = session.sessionContext?.recommendationStrategy || 'general_practice';
            const success = session.success;

            // Time-based performance
            timeBasedPerformance[timeOfDay].attempts++;
            if (success) timeBasedPerformance[timeOfDay].successes++;
            timeBasedPerformance[timeOfDay].totalTime += session.timeSpent || 15;

            // Strategy performance
            if (strategyPerformance[strategy]) {
                strategyPerformance[strategy].attempts++;
                if (success) strategyPerformance[strategy].successes++;
            }
        });
    });

    // Calculate averages
    Object.keys(groupStats).forEach(group => {
        groupStats[group].avgSolveCount =
            groupStats[group].avgSolveCount / groupStats[group].count;
    });

    // Calculate time-based success rates
    Object.keys(timeBasedPerformance).forEach(timeOfDay => {
        const stats = timeBasedPerformance[timeOfDay];
        stats.successRate = stats.attempts > 0 ? stats.successes / stats.attempts : 0.5;
        stats.avgTime = stats.attempts > 0 ? stats.totalTime / stats.attempts : 15;
    });

    // Calculate strategy effectiveness
    Object.keys(strategyPerformance).forEach(strategy => {
        const stats = strategyPerformance[strategy];
        stats.successRate = stats.attempts > 0 ? stats.successes / stats.attempts : 0.5;
        stats.effectiveness = stats.attempts > 0 ? stats.successRate : 0.5;
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

    // Find weak and strong areas
    const weakAreas = Object.entries(groupStats)
        .filter(([group, stats]) => stats.count < 3 || stats.avgSolveCount > 2)
        .map(([group]) => group);

    const strongAreas = Object.entries(groupStats)
        .filter(([group, stats]) => stats.count >= 5 && stats.avgSolveCount <= 1.5)
        .map(([group]) => group);

    // NEW: Determine optimal time of day
    const optimalTimeOfDay = Object.entries(timeBasedPerformance)
        .filter(([time, stats]) => stats.attempts >= 3) // Need at least 3 attempts to be meaningful
        .sort((a, b) => b[1].successRate - a[1].successRate)[0]?.[0] || 'morning';

    return {
        groupStats,
        difficultyStats,
        userLevel,
        weakAreas,
        strongAreas,
        recentActivity: recentActivity.length,
        strugglingQuestions,
        totalSolved,
        // NEW adaptive features
        timeBasedPerformance,
        strategyPerformance,
        optimalTimeOfDay,
        adaptiveInsights: {
            hasTimePreferences: Object.values(timeBasedPerformance).some(stats => stats.attempts >= 3),
            mostEffectiveStrategy: Object.entries(strategyPerformance)
                .filter(([strategy, stats]) => stats.attempts >= 3)
                .sort((a, b) => b[1].effectiveness - a[1].effectiveness)[0]?.[0] || 'weak_area_reinforcement',
            needsWeightAdjustment: userProfile.shouldAdjustWeights()
        }
    };
};

// Update user profile based on latest analysis
const updateUserProfileFromAnalysis = async (userProfile, analysis) => {
    // Update time preferences
    Object.keys(analysis.timeBasedPerformance).forEach(timeOfDay => {
        const stats = analysis.timeBasedPerformance[timeOfDay];
        if (stats.attempts > 0) {
            userProfile.timePreferences[`${timeOfDay}Performance`] = {
                averageSuccessRate: stats.successRate,
                averageTimePerQuestion: stats.avgTime,
                sessionCount: stats.attempts
            };
        }
    });

    // Update optimal time of day
    userProfile.timePreferences.optimalTimeOfDay = analysis.optimalTimeOfDay;

    // Update computed metrics
    userProfile.computedMetrics.strongestTimeOfDay = analysis.optimalTimeOfDay;
    userProfile.computedMetrics.weakestTopics = analysis.weakAreas.slice(0, 3);
    userProfile.computedMetrics.readyForAdvancement =
        analysis.userLevel === 'beginner' && analysis.totalSolved >= 20 ||
        analysis.userLevel === 'intermediate' && analysis.totalSolved >= 50;

    // Update data quality
    userProfile.adaptationMetadata.dataQuality.hasSufficientData = analysis.totalSolved >= 20;
    userProfile.adaptationMetadata.dataQuality.lastQualityCheck = new Date();
    userProfile.adaptationMetadata.lastAnalyzed = new Date();
};

// Generate adaptive recommendations using user profile
const generateAdaptiveRecommendations = async (userId, analysis, userProfile, count) => {
    const recommendations = [];
    const solvedQuestionIds = await SolveHistory.find({ userId }).distinct('questionId');

    // Get adaptive weights from user profile
    const weights = userProfile.getAdaptiveWeights();

    console.log(`🎯 Using adaptive weights:`, weights);

    // Strategy 1: Weak area reinforcement (adaptive weight)
    const weakAreaCount = Math.ceil(count * weights.weak_area_reinforcement);
    if (analysis.weakAreas.length > 0) {
        const weakAreaQuestions = await Question.find({
            _id: { $nin: solvedQuestionIds },
            group: { $in: analysis.weakAreas },
            difficulty: getDifficultyForLevel(analysis.userLevel)
        }).limit(weakAreaCount);

        weakAreaQuestions.forEach(question => {
            recommendations.push({
                question,
                reason: `🎯 Adaptive: Strengthen weak area (${question.group})`,
                priority: 'high',
                strategy: 'weak_area_reinforcement',
                adaptiveContext: {
                    weightUsed: weights.weak_area_reinforcement,
                    timeOptimized: analysis.optimalTimeOfDay,
                    personalizedDifficulty: 'standard'
                }
            });
        });
    }

    // Strategy 2: Progressive difficulty (adaptive weight)
    const progressiveCount = Math.ceil(count * weights.progressive_difficulty);
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
                reason: `📈 Adaptive: Progressive challenge (${nextDifficulty})`,
                priority: 'medium',
                strategy: 'progressive_difficulty',
                adaptiveContext: {
                    weightUsed: weights.progressive_difficulty,
                    timeOptimized: analysis.optimalTimeOfDay
                }
            });
        });
    }

    // Strategy 3: Spaced repetition (adaptive weight)
    const repetitionCount = Math.ceil(count * weights.spaced_repetition);
    if (analysis.strugglingQuestions.length > 0) {
        const needsReview = analysis.strugglingQuestions
            .sort((a, b) => b.solveCount - a.solveCount)
            .slice(0, repetitionCount);

        needsReview.forEach(item => {
            recommendations.push({
                question: item.question,
                reason: `🔄 Adaptive: Spaced review (solved ${item.solveCount} times)`,
                priority: 'high',
                strategy: 'spaced_repetition',
                lastSolved: item.lastSolved,
                adaptiveContext: {
                    weightUsed: weights.spaced_repetition,
                    reviewReason: 'struggling_pattern'
                }
            });
        });
    }

    // Strategy 4: Topic exploration (adaptive weight)
    const explorationCount = Math.ceil(count * weights.topic_exploration);
    const remainingSlots = Math.max(0, explorationCount);
    if (remainingSlots > 0) {
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
            }).limit(remainingSlots);

            explorationQuestions.forEach(question => {
                recommendations.push({
                    question,
                    reason: `🗺️ Adaptive: Explore new topic (${question.group})`,
                    priority: 'low',
                    strategy: 'topic_exploration',
                    adaptiveContext: {
                        weightUsed: weights.topic_exploration,
                        explorationReason: 'new_topic'
                    }
                });
            });
        }
    }

    // Strategy 5: General practice (fill remaining slots)
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
                reason: `⭐ Adaptive: Quality practice question`,
                priority: 'medium',
                strategy: 'general_practice',
                adaptiveContext: {
                    weightUsed: weights.general_practice,
                    fillerReason: 'quality_practice'
                }
            });
        });
    }

    // Sort by priority and return top count
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return recommendations
        .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
        .slice(0, count);
};

// Adjust strategy weights based on performance
const adjustStrategyWeights = async (userProfile, analysis) => {
    const currentWeights = userProfile.getAdaptiveWeights();
    const recentSuccessRate = userProfile.recentPerformance.recentSuccessRate;

    console.log(`🔧 Adjusting weights for user. Current success rate: ${recentSuccessRate}`);

    // Store current weights in history
    userProfile.adaptiveWeights.adjustmentHistory.push({
        date: new Date(),
        previousWeights: { ...currentWeights },
        reason: recentSuccessRate < 0.4 ? 'poor_performance' : 'good_performance',
        performanceScore: recentSuccessRate
    });

    // Adjustment logic
    if (recentSuccessRate < 0.4) {
        // Poor performance - increase weak area reinforcement, decrease difficulty progression
        userProfile.adaptiveWeights.weak_area_reinforcement = Math.min(0.7, currentWeights.weak_area_reinforcement + 0.1);
        userProfile.adaptiveWeights.progressive_difficulty = Math.max(0.1, currentWeights.progressive_difficulty - 0.1);
        userProfile.adaptiveWeights.spaced_repetition = Math.min(0.5, currentWeights.spaced_repetition + 0.05);

        console.log(`📉 Poor performance detected. Increased weak area focus.`);
    } else if (recentSuccessRate > 0.8) {
        // Good performance - increase difficulty progression, decrease weak area focus
        userProfile.adaptiveWeights.progressive_difficulty = Math.min(0.6, currentWeights.progressive_difficulty + 0.1);
        userProfile.adaptiveWeights.weak_area_reinforcement = Math.max(0.1, currentWeights.weak_area_reinforcement - 0.05);
        userProfile.adaptiveWeights.topic_exploration = Math.min(0.2, currentWeights.topic_exploration + 0.05);

        console.log(`📈 Good performance detected. Increased challenge level.`);
    }

    // Ensure weights sum to approximately 1.0
    const totalWeight = userProfile.adaptiveWeights.weak_area_reinforcement +
        userProfile.adaptiveWeights.progressive_difficulty +
        userProfile.adaptiveWeights.spaced_repetition +
        userProfile.adaptiveWeights.topic_exploration +
        userProfile.adaptiveWeights.general_practice;

    // Normalize if needed
    if (Math.abs(totalWeight - 1.0) > 0.05) {
        const factor = 1.0 / totalWeight;
        userProfile.adaptiveWeights.weak_area_reinforcement *= factor;
        userProfile.adaptiveWeights.progressive_difficulty *= factor;
        userProfile.adaptiveWeights.spaced_repetition *= factor;
        userProfile.adaptiveWeights.topic_exploration *= factor;
        userProfile.adaptiveWeights.general_practice *= factor;
    }

    userProfile.adaptationMetadata.lastWeightAdjustment = new Date();

    console.log(`✅ New adaptive weights:`, userProfile.getAdaptiveWeights());
};

// Helper functions
const getDifficultyForLevel = (userLevel) => {
    switch (userLevel) {
        case 'beginner': return 'Easy';
        case 'intermediate': return ['Easy', 'Medium'];
        case 'advanced': return ['Medium', 'Hard'];
        default: return 'Easy';
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

/*
 * @desc     Update user profile after solving a question
 * @route    POST /api/v1/adaptive-recommendations/:userId/update
 * @access   Public
 */
const updateAdaptiveProfile = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const { questionId, success, timeSpent, strategy } = req.body;

    const userProfile = await UserProfile.findByUserId(userId);
    if (!userProfile) {
        return next(new ErrorResponse('User profile not found', 404));
    }

    // Update recent performance
    const question = await Question.findById(questionId);
    userProfile.updateRecentPerformance({
        questionId,
        success,
        timeSpent,
        difficulty: question?.difficulty || 'Medium',
        strategy
    });

    await userProfile.save();

    res.status(200).json({
        success: true,
        data: {
            recentPerformance: userProfile.recentPerformance,
            shouldAdjustWeights: userProfile.shouldAdjustWeights()
        }
    });
});

export {
    getAdaptiveDailyRecommendations,
    updateAdaptiveProfile
}; 