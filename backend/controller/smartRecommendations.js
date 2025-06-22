import DailyRecommendationBatch from '../models/DailyRecommendationBatch.js';
import SolveHistory from '../models/SolveHistory.js';
import UserProfile from '../models/UserProfile.js';
import Question from '../models/Question.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../middleware/error.js';

/*
 * @desc     Get smart daily recommendations with hybrid caching
 * @route    GET /api/v1/smart-recommendations/:userId/daily
 * @access   Public
 */
const getSmartDailyRecommendations = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const { count = 5, forceRefresh = false } = req.query;

    console.log(`🧠 Getting smart recommendations for user: ${userId}`);

    try {
        // Check for existing batch today
        let batch = await DailyRecommendationBatch.findTodaysBatch(userId);

        if (!batch) {
            // No batch exists - create fresh daily batch
            console.log('📅 No batch found - creating fresh daily batch');
            batch = await createFreshDailyBatch(userId, parseInt(count));
        } else {
            // Batch exists - check if refresh is needed/allowed
            const refreshCheck = batch.shouldRefresh(userId);

            if (forceRefresh === 'true' || refreshCheck.allowed) {
                console.log('🔄 Refreshing batch - conditions met:', refreshCheck.reasons);
                batch = await performSmartRefresh(batch, userId, parseInt(count));
            } else {
                console.log('📋 Serving cached batch - refresh not allowed');
                console.log('   Next refresh available:', refreshCheck.nextRefreshAvailable);
            }
        }

        // Get progress information
        const progress = batch.getProgress();

        // Get completed question IDs for status checking
        const completedQuestionIds = batch.questionsCompleted.map(q => q.questionId);

        // Format response
        const response = {
            success: true,
            data: {
                recommendations: batch.recommendations.map(rec => {
                    const questionId = rec.question._id || rec.question.id;
                    const isCompleted = completedQuestionIds.includes(questionId);
                    const completionData = isCompleted ?
                        batch.questionsCompleted.find(q => q.questionId === questionId) : null;

                    return {
                        question: rec.question,
                        reason: rec.reason,
                        priority: rec.priority,
                        strategy: rec.strategy,
                        adaptiveContext: rec.adaptiveContext,
                        completed: isCompleted,
                        lastSolved: completionData ? completionData.completedAt : null
                    };
                }),
                analysis: batch.analysis,
                progress,
                batchInfo: {
                    generatedAt: batch.generatedAt,
                    refreshCount: batch.refreshCount,
                    batchType: batch.batchType,
                    canRefresh: batch.shouldRefresh(userId).allowed,
                    nextRefreshAvailable: batch.shouldRefresh(userId).nextRefreshAvailable
                },
                totalSolved: batch.analysis.totalSolved
            }
        };

        res.status(200).json(response);

    } catch (error) {
        console.error('❌ Error in smart recommendations:', error);
        return next(new ErrorResponse('Failed to generate smart recommendations', 500));
    }
});

/*
 * @desc     Mark question as completed in daily batch
 * @route    POST /api/v1/smart-recommendations/:userId/complete
 * @access   Public
 */
const markQuestionCompleted = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const { questionId, timeSpent, success = true } = req.body;

    console.log(`✅ Marking question completed: ${questionId} for user: ${userId}`);

    try {
        // Find today's batch
        const batch = await DailyRecommendationBatch.findTodaysBatch(userId);

        if (!batch) {
            return next(new ErrorResponse('No active daily batch found', 404));
        }

        // Mark question as completed
        await batch.markQuestionCompleted(questionId, { timeSpent, success });

        // Get updated progress
        const progress = batch.getProgress();

        res.status(200).json({
            success: true,
            data: {
                progress,
                canRefresh: batch.shouldRefresh(userId).allowed,
                message: progress.isComplete ?
                    '🎉 Daily goal completed! Bonus questions available.' :
                    `📈 Progress: ${progress.completed}/${progress.total} completed`
            }
        });

    } catch (error) {
        console.error('❌ Error marking question completed:', error);
        return next(new ErrorResponse('Failed to update completion status', 500));
    }
});

/*
 * @desc     Force refresh recommendations (with validation)
 * @route    POST /api/v1/smart-recommendations/:userId/refresh
 * @access   Public
 */
const forceRefreshRecommendations = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    console.log(`🔄 Force refresh requested for user: ${userId}`);

    try {
        const batch = await DailyRecommendationBatch.findTodaysBatch(userId);

        if (!batch) {
            return next(new ErrorResponse('No active daily batch found', 404));
        }

        const refreshCheck = batch.shouldRefresh(userId);

        if (!refreshCheck.allowed) {
            return res.status(400).json({
                success: false,
                message: 'Refresh not allowed yet',
                reasons: refreshCheck.reasons,
                nextRefreshAvailable: refreshCheck.nextRefreshAvailable
            });
        }

        // Perform smart refresh
        const refreshedBatch = await performSmartRefresh(batch, userId, 5);
        const progress = refreshedBatch.getProgress();

        // Get completed question IDs for status checking
        const completedQuestionIds = refreshedBatch.questionsCompleted.map(q => q.questionId);

        res.status(200).json({
            success: true,
            data: {
                recommendations: refreshedBatch.recommendations.map(rec => {
                    const questionId = rec.question._id || rec.question.id;
                    const isCompleted = completedQuestionIds.includes(questionId);
                    const completionData = isCompleted ?
                        refreshedBatch.questionsCompleted.find(q => q.questionId === questionId) : null;

                    return {
                        question: rec.question,
                        reason: rec.reason,
                        priority: rec.priority,
                        strategy: rec.strategy,
                        adaptiveContext: rec.adaptiveContext,
                        completed: isCompleted,
                        lastSolved: completionData ? completionData.completedAt : null
                    };
                }),
                analysis: refreshedBatch.analysis,
                progress,
                batchInfo: {
                    generatedAt: refreshedBatch.generatedAt,
                    refreshCount: refreshedBatch.refreshCount,
                    batchType: refreshedBatch.batchType
                },
                message: '🔄 Recommendations refreshed with your latest progress!'
            }
        });

    } catch (error) {
        console.error('❌ Error in force refresh:', error);
        return next(new ErrorResponse('Failed to refresh recommendations', 500));
    }
});

// Helper Functions

const createFreshDailyBatch = async (userId, count) => {
    console.log(`🌅 Creating fresh daily batch for user: ${userId}`);

    // Get or create user profile
    let userProfile = await UserProfile.findByUserId(userId);
    if (!userProfile) {
        const existingHistory = await SolveHistory.find({ userId }).populate('questionId');
        userProfile = await UserProfile.createFromSolveHistory(userId, existingHistory);
        await userProfile.save();
    }

    // Get user's solve history
    const userHistory = await SolveHistory.find({ userId }).populate('questionId');

    // Analyze patterns with adaptive enhancements
    const analysis = await analyzeUserPatternsAdaptive(userId, userHistory, userProfile);

    // Generate fresh recommendations
    const recommendations = await generateAdaptiveRecommendations(
        userId,
        analysis,
        userProfile,
        count
    );

    // Create and save batch
    const batch = await DailyRecommendationBatch.createDailyBatch(userId, recommendations, analysis);

    console.log(`✅ Created fresh batch with ${recommendations.length} recommendations`);
    return batch;
};

const performSmartRefresh = async (currentBatch, userId, count) => {
    console.log(`🔄 Performing smart refresh for user: ${userId}`);

    // Get completed question IDs
    const completedQuestionIds = currentBatch.questionsCompleted.map(q => q.questionId);

    // Get remaining recommendations (not completed)
    const remainingRecommendations = currentBatch.recommendations.filter(
        rec => !completedQuestionIds.includes(rec.question._id || rec.question.id)
    );

    console.log(`   📊 Remaining questions: ${remainingRecommendations.length}`);
    console.log(`   ✅ Completed questions: ${completedQuestionIds.length}`);

    // Get fresh analysis
    const userHistory = await SolveHistory.find({ userId }).populate('questionId');
    let userProfile = await UserProfile.findByUserId(userId);
    const freshAnalysis = await analyzeUserPatternsAdaptive(userId, userHistory, userProfile);

    // Smart filtering: keep relevant remaining questions
    const relevantRemaining = remainingRecommendations.filter(rec =>
        isStillRelevant(rec, freshAnalysis)
    );

    console.log(`   🎯 Relevant remaining: ${relevantRemaining.length}`);

    // Mark carried-over questions
    const carriedOverRecommendations = relevantRemaining.map(rec => ({
        ...rec,
        adaptiveContext: {
            ...rec.adaptiveContext,
            isCarriedOver: true,
            originalBatchTime: rec.adaptiveContext.originalBatchTime || currentBatch.generatedAt
        }
    }));

    // Generate new questions to fill the gap
    const newQuestionsNeeded = count - carriedOverRecommendations.length;
    let newRecommendations = [];

    if (newQuestionsNeeded > 0) {
        console.log(`   🆕 Generating ${newQuestionsNeeded} new questions`);

        // Get already recommended question IDs (from current batch + carried over)
        const existingQuestionIds = [
            ...currentBatch.recommendations.map(r => r.question._id || r.question.id),
            ...completedQuestionIds
        ];

        newRecommendations = await generateAdaptiveRecommendations(
            userId,
            freshAnalysis,
            userProfile,
            newQuestionsNeeded,
            existingQuestionIds // Exclude these questions
        );
    }

    // Combine carried over + new recommendations
    const finalRecommendations = [
        ...carriedOverRecommendations,
        ...newRecommendations
    ];

    // Update batch
    currentBatch.recommendations = finalRecommendations;
    currentBatch.analysis = freshAnalysis;
    currentBatch.refreshCount += 1;
    currentBatch.lastRefreshAt = new Date();
    currentBatch.batchType = 'refresh';
    currentBatch.metadata.totalRefreshes += 1;
    currentBatch.metadata.questionsCarriedOver = carriedOverRecommendations.length;
    currentBatch.metadata.questionsReplaced = remainingRecommendations.length - carriedOverRecommendations.length;

    await currentBatch.save();

    console.log(`✅ Smart refresh completed - ${carriedOverRecommendations.length} carried over, ${newRecommendations.length} new`);
    return currentBatch;
};

const isStillRelevant = (recommendation, newAnalysis) => {
    const question = recommendation.question;
    const strategy = recommendation.strategy;
    const priority = recommendation.priority;

    // Always keep high-priority strategies
    if (['spaced_repetition'].includes(strategy) && priority === 'high') {
        return true;
    }

    // Keep if still in weak areas
    if (strategy === 'weak_area_reinforcement' &&
        newAnalysis.weakAreas.includes(question.group)) {
        return true;
    }

    // Keep progressive difficulty if still appropriate level
    if (strategy === 'progressive_difficulty') {
        const appropriateDifficulties = getDifficultyForLevel(newAnalysis.userLevel);
        if (Array.isArray(appropriateDifficulties)) {
            return appropriateDifficulties.includes(question.difficulty);
        }
        return appropriateDifficulties === question.difficulty;
    }

    // Keep general practice if high priority
    if (strategy === 'general_practice' && priority === 'high') {
        return true;
    }

    // Drop low priority topic exploration (user has progressed)
    if (strategy === 'topic_exploration' && priority === 'low') {
        return false;
    }

    // Default: keep medium priority questions
    return priority !== 'low';
};

// Simplified analysis function (reusing adaptive logic)
const analyzeUserPatternsAdaptive = async (userId, userHistory, userProfile) => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groupStats = {};
    const difficultyStats = { Easy: 0, Medium: 0, Hard: 0 };
    const recentActivity = [];
    const strugglingQuestions = [];

    userHistory.forEach(history => {
        const question = history.questionId;
        if (!question) return;

        if (!groupStats[question.group]) {
            groupStats[question.group] = { count: 0, avgSolveCount: 0 };
        }
        groupStats[question.group].count++;
        groupStats[question.group].avgSolveCount += history.solveCount;
        difficultyStats[question.difficulty]++;

        if (history.lastUpdatedAt >= oneWeekAgo) {
            recentActivity.push(history);
        }

        if (history.solveCount > 2 && history.lastUpdatedAt >= oneMonthAgo) {
            strugglingQuestions.push({
                question,
                solveCount: history.solveCount,
                lastSolved: history.lastUpdatedAt
            });
        }
    });

    Object.keys(groupStats).forEach(group => {
        groupStats[group].avgSolveCount =
            groupStats[group].avgSolveCount / groupStats[group].count;
    });

    const totalSolved = userHistory.length;
    const hardPercentage = (difficultyStats.Hard / totalSolved) * 100;
    const mediumPercentage = (difficultyStats.Medium / totalSolved) * 100;

    let userLevel = 'beginner';
    if (totalSolved > 50 && hardPercentage > 20) {
        userLevel = 'advanced';
    } else if (totalSolved > 20 && mediumPercentage > 40) {
        userLevel = 'intermediate';
    }

    const weakAreas = Object.entries(groupStats)
        .filter(([group, stats]) => stats.count < 3 || stats.avgSolveCount > 2)
        .map(([group]) => group);

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
        totalSolved,
        adaptiveFeatures: {
            enabled: totalSolved >= 3,
            level: totalSolved >= 20 ? 'full' : 'basic'
        }
    };
};

const generateAdaptiveRecommendations = async (userId, analysis, userProfile, count, excludeQuestionIds = []) => {
    const recommendations = [];
    const solvedQuestionIds = await SolveHistory.find({ userId }).distinct('questionId');
    const allExcludedIds = [...solvedQuestionIds, ...excludeQuestionIds];

    const weights = userProfile.getAdaptiveWeights();

    // Strategy 1: Weak area reinforcement
    const weakAreaCount = Math.ceil(count * weights.weak_area_reinforcement);
    if (analysis.weakAreas.length > 0) {
        const weakAreaQuestions = await Question.find({
            _id: { $nin: allExcludedIds },
            group: { $in: analysis.weakAreas },
            difficulty: getDifficultyForLevel(analysis.userLevel)
        }).limit(weakAreaCount);

        weakAreaQuestions.forEach(question => {
            recommendations.push({
                question,
                reason: `🎯 Strengthen weak area: ${question.group}`,
                priority: 'high',
                strategy: 'weak_area_reinforcement',
                adaptiveContext: {
                    weightUsed: weights.weak_area_reinforcement,
                    isCarriedOver: false,
                    originalBatchTime: new Date()
                }
            });
        });
    }

    // Fill remaining slots with general practice
    const remainingCount = count - recommendations.length;
    if (remainingCount > 0) {
        const fillerQuestions = await Question.find({
            _id: { $nin: [...allExcludedIds, ...recommendations.map(r => r.question._id)] },
            list: { $in: ['TOP 150'] },
            difficulty: getDifficultyForLevel(analysis.userLevel)
        }).limit(remainingCount);

        fillerQuestions.forEach(question => {
            recommendations.push({
                question,
                reason: `⭐ Quality practice question`,
                priority: 'medium',
                strategy: 'general_practice',
                adaptiveContext: {
                    weightUsed: weights.general_practice,
                    isCarriedOver: false,
                    originalBatchTime: new Date()
                }
            });
        });
    }

    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return recommendations
        .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
        .slice(0, count);
};

const getDifficultyForLevel = (userLevel) => {
    switch (userLevel) {
        case 'beginner': return 'Easy';
        case 'intermediate': return ['Easy', 'Medium'];
        case 'advanced': return ['Medium', 'Hard'];
        default: return 'Easy';
    }
};

export {
    getSmartDailyRecommendations,
    markQuestionCompleted,
    forceRefreshRecommendations
}; 