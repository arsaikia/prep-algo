import DailyRecommendationBatch from '../models/DailyRecommendationBatch.js';
import SolveHistory from '../models/SolveHistory.js';
import UserProfile from '../models/UserProfile.js';
import Question from '../models/Question.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';

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
        const refreshCheck = batch.shouldRefresh(userId);

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
                    strategy: refreshCheck.strategy,
                    canRefresh: refreshCheck.allowed,
                    canReplaceCompleted: refreshCheck.canReplaceCompleted,
                    nextRefreshAvailable: refreshCheck.nextRefreshAvailable,
                    completedCount: batch.questionsCompleted.length
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
 * @desc     Replace completed questions with fresh ones (keep incomplete)
 * @route    POST /api/v1/smart-recommendations/:userId/replace-completed
 * @access   Public
 */
const replaceCompletedQuestions = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    console.log(`🔄 Replace completed questions requested for user: ${userId}`);

    try {
        const batch = await DailyRecommendationBatch.findTodaysBatch(userId);

        if (!batch) {
            return next(new ErrorResponse('No active daily batch found', 404));
        }

        if (batch.questionsCompleted.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No completed questions to replace'
            });
        }

        // Perform selective replacement - only replace completed questions
        const refreshedBatch = await performSelectiveRefresh(batch, userId);
        const progress = refreshedBatch.getProgress();
        const completedQuestionIds = refreshedBatch.questionsCompleted.map(q => q.questionId);
        const refreshCheck = refreshedBatch.shouldRefresh(userId);

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
                    batchType: refreshedBatch.batchType,
                    strategy: refreshCheck.strategy,
                    canRefresh: refreshCheck.allowed,
                    canReplaceCompleted: refreshCheck.canReplaceCompleted,
                    completedCount: refreshedBatch.questionsCompleted.length
                },
                message: `🔄 Replaced ${batch.questionsCompleted.length} completed questions with fresh ones!`
            }
        });

    } catch (error) {
        console.error('❌ Error replacing completed questions:', error);
        return next(new ErrorResponse('Failed to replace completed questions', 500));
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

        res.status(200).json({
            success: true,
            data: {
                recommendations: refreshedBatch.recommendations.map(rec => ({
                    question: rec.question,
                    reason: rec.reason,
                    priority: rec.priority,
                    strategy: rec.strategy,
                    adaptiveContext: rec.adaptiveContext
                })),
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

const performSelectiveRefresh = async (currentBatch, userId) => {
    console.log(`🎯 Performing selective refresh for user: ${userId}`);

    // Get user profile and fresh analysis
    let userProfile = await UserProfile.findByUserId(userId);
    if (!userProfile) {
        const existingHistory = await SolveHistory.find({ userId }).populate('questionId');
        userProfile = await UserProfile.createFromSolveHistory(userId, existingHistory);
        await userProfile.save();
    }

    const userHistory = await SolveHistory.find({ userId }).populate('questionId');
    const freshAnalysis = await analyzeUserPatternsAdaptive(userId, userHistory, userProfile);

    // Get completed question IDs
    const completedQuestionIds = currentBatch.questionsCompleted.map(q => q.questionId);

    // Separate completed and incomplete recommendations
    const incompleteRecommendations = currentBatch.recommendations.filter(rec => {
        const questionId = rec.question._id || rec.question.id;
        return !completedQuestionIds.includes(questionId);
    });

    const completedCount = currentBatch.recommendations.length - incompleteRecommendations.length;

    console.log(`   📋 Keeping ${incompleteRecommendations.length} incomplete questions`);
    console.log(`   🔄 Replacing ${completedCount} completed questions`);

    // Generate new questions to replace completed ones
    let newRecommendations = [];
    if (completedCount > 0) {
        // Get all question IDs to exclude (solved + current batch)
        const allExcludedIds = [
            ...await SolveHistory.find({ userId }).distinct('questionId'),
            ...currentBatch.recommendations.map(r => r.question._id || r.question.id)
        ];

        newRecommendations = await generateAdaptiveRecommendations(
            userId,
            freshAnalysis,
            userProfile,
            completedCount,
            allExcludedIds
        );
    }

    // Combine incomplete + new recommendations
    const finalRecommendations = [
        ...incompleteRecommendations, // Keep incomplete as-is
        ...newRecommendations         // Add fresh questions
    ];

    // Update batch
    currentBatch.recommendations = finalRecommendations;
    currentBatch.analysis = freshAnalysis;
    currentBatch.refreshCount += 1;
    currentBatch.lastRefreshAt = new Date();
    currentBatch.batchType = 'selective_refresh';
    currentBatch.metadata.totalRefreshes += 1;
    currentBatch.metadata.questionsReplaced = completedCount;

    await currentBatch.save();

    console.log(`✅ Selective refresh completed - ${completedCount} questions replaced`);
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

    // Standard analysis
    const groupStats = {};
    const difficultyStats = { Easy: 0, Medium: 0, Hard: 0 };
    const recentActivity = [];
    const strugglingQuestions = [];

    // NEW: Streak and mastery analysis
    const dailyActivity = {};
    const topicMastery = {};

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

        // NEW: Daily activity tracking for streaks
        const dateKey = history.lastUpdatedAt.toISOString().split('T')[0];
        if (!dailyActivity[dateKey]) {
            dailyActivity[dateKey] = {
                date: dateKey,
                questionsCompleted: 0,
                topics: [],
                difficulties: { Easy: 0, Medium: 0, Hard: 0 }
            };
        }
        dailyActivity[dateKey].questionsCompleted++;
        if (!dailyActivity[dateKey].topics.includes(question.group)) {
            dailyActivity[dateKey].topics.push(question.group);
        }
        dailyActivity[dateKey].difficulties[question.difficulty]++;

        // NEW: Topic mastery tracking
        if (!topicMastery[question.group]) {
            topicMastery[question.group] = {
                topic: question.group,
                totalQuestions: 0,
                solvedQuestions: 0, // Changed: Count all solved questions, not just first-attempt
                difficulties: { Easy: 0, Medium: 0, Hard: 0 },
                averageAttempts: 0,
                firstStudied: history.firstSolvedAt,
                lastStudied: history.lastUpdatedAt
            };
        }

        const topicData = topicMastery[question.group];
        topicData.totalQuestions++;
        topicData.solvedQuestions++; // Count all solved questions
        topicData.difficulties[question.difficulty]++;
        topicData.averageAttempts = (topicData.averageAttempts * (topicData.totalQuestions - 1) + history.solveCount) / topicData.totalQuestions;
        topicData.lastStudied = history.lastUpdatedAt;
    });

    // Calculate averages for standard analysis
    Object.keys(groupStats).forEach(group => {
        groupStats[group].avgSolveCount =
            groupStats[group].avgSolveCount / groupStats[group].count;
    });

    // NEW: Calculate current streak
    const streakInfo = calculateCurrentStreak(dailyActivity);

    // NEW: Calculate topic mastery levels
    const masteryLevels = await calculateTopicMastery(topicMastery);

    // Determine user level based on both difficulty distribution AND topic mastery breadth
    const totalSolved = userHistory.length;
    const hardPercentage = (difficultyStats.Hard / totalSolved) * 100;
    const mediumPercentage = (difficultyStats.Medium / totalSolved) * 100;

    // Count mastery levels and calculate percentages
    const masteredTopics = masteryLevels.filter(t => t.level === 'mastered').length;
    const proficientTopics = masteryLevels.filter(t => t.level === 'proficient').length;
    const practicingTopics = masteryLevels.filter(t => t.level === 'practicing').length;
    const totalTopicsAttempted = masteryLevels.length;

    // Get total available topics from database
    const topicQuestionCounts = await getTopicQuestionCounts();
    const totalAvailableTopics = Object.keys(topicQuestionCounts).length;

    // Calculate percentages for dynamic thresholds
    const topicBreadthPercentage = (totalTopicsAttempted / totalAvailableTopics) * 100;
    const masteredPercentage = (masteredTopics / totalTopicsAttempted) * 100;
    const proficientPlusPercentage = ((proficientTopics + masteredTopics) / totalTopicsAttempted) * 100;

    let userLevel = 'beginner';

    if (totalSolved >= 60 && topicBreadthPercentage >= 40 &&
        ((masteredPercentage >= 25 && proficientPlusPercentage >= 50) ||
            (masteredTopics >= 2 && proficientTopics >= 3) ||
            (hardPercentage >= 15 && masteredTopics >= 2))) {
        // Advanced: Significant breadth (40%+ of all topics) AND depth
        // - 25%+ of attempted topics mastered with 50%+ proficient+mastered
        // - OR at least 2 mastered + 3 proficient topics
        // - OR strong hard problem performance with some mastery
        userLevel = 'advanced';
    } else if (totalSolved >= 25 && topicBreadthPercentage >= 25 &&
        ((masteredTopics >= 1 && (proficientTopics + practicingTopics) >= 3) ||
            (mediumPercentage >= 35 && topicBreadthPercentage >= 30) ||
            (hardPercentage >= 8 && topicBreadthPercentage >= 20))) {
        // Intermediate: Some breadth (25%+ of all topics) with demonstrated competency
        // - At least 1 mastered topic with 3+ proficient/practicing topics
        // - OR good medium performance across 30%+ of topics
        // - OR some hard problems across 20%+ of topics
        userLevel = 'intermediate';
    }

    // Beginner: Everything else (< 25 questions OR < 25% topic breadth OR no mastery)

    // Find weak and strong areas
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
        // NEW: Enhanced analytics
        streakInfo,
        topicMastery: masteryLevels,
        dailyActivity: Object.values(dailyActivity).sort((a, b) => new Date(b.date) - new Date(a.date)),
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

// NEW: Calculate current learning streak
const calculateCurrentStreak = (dailyActivity) => {
    const today = new Date();
    const sortedDays = Object.keys(dailyActivity).sort((a, b) => new Date(b) - new Date(a));

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastActivityDate = null;

    // Calculate current streak (consecutive days from today backwards)
    for (let i = 0; i < 365; i++) { // Check last year maximum
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateKey = checkDate.toISOString().split('T')[0];

        if (dailyActivity[dateKey] && dailyActivity[dateKey].questionsCompleted > 0) {
            if (i === 0 || currentStreak > 0) { // Today or continuing streak
                currentStreak++;
                if (!lastActivityDate) lastActivityDate = dateKey;
            }
        } else {
            if (i === 0) {
                // No activity today, check if yesterday had activity
                continue;
            } else {
                break; // Streak broken
            }
        }
    }

    // Calculate longest streak ever
    let currentTempStreak = 0;
    const allDates = sortedDays.sort((a, b) => new Date(a) - new Date(b));

    for (let i = 0; i < allDates.length; i++) {
        const currentDate = new Date(allDates[i]);
        const nextDate = i < allDates.length - 1 ? new Date(allDates[i + 1]) : null;

        currentTempStreak++;

        if (!nextDate || (nextDate - currentDate) > 24 * 60 * 60 * 1000) {
            // End of streak or last day
            longestStreak = Math.max(longestStreak, currentTempStreak);
            currentTempStreak = 0;
        }
    }

    return {
        currentStreak,
        longestStreak,
        lastActivityDate,
        totalActiveDays: sortedDays.length
    };
};

// NEW: Get dynamic topic question counts from database
const getTopicQuestionCounts = async () => {
    try {
        const topicCounts = await Question.aggregate([
            {
                $group: {
                    _id: '$group',
                    totalQuestions: { $sum: 1 }
                }
            }
        ]);

        const countMap = {};
        topicCounts.forEach(item => {
            countMap[item._id] = item.totalQuestions;
        });

        return countMap;
    } catch (error) {
        console.error('Error fetching topic question counts:', error);
        return {};
    }
};

// NEW: Calculate topic mastery levels using percentage of available questions
const calculateTopicMastery = async (topicMasteryData) => {
    // Get dynamic topic counts from database
    const topicQuestionCounts = await getTopicQuestionCounts();

    return Object.values(topicMasteryData).map(topic => {
        const solveRate = topic.solvedQuestions / topic.totalQuestions; // User's solve rate
        const { Easy, Medium, Hard } = topic.difficulties;
        const avgAttempts = topic.averageAttempts || 1;

        // Get total questions available in this topic from database
        const totalAvailable = topicQuestionCounts[topic.topic] || topic.totalQuestions;
        const topicCoveragePercentage = (topic.totalQuestions / totalAvailable) * 100;

        // Determine mastery level using percentage of topic coverage + performance
        let level = 'beginner';

        if (topicCoveragePercentage >= 80 && solveRate >= 0.9 && avgAttempts <= 2.5) {
            // Mastered: 80%+ of topic covered, 90%+ solved, reasonably efficient solving
            level = 'mastered';
        } else if (topicCoveragePercentage >= 60 && solveRate >= 0.85 && avgAttempts <= 3.0) {
            // Proficient: 60%+ of topic covered, 85%+ solved, good performance
            level = 'proficient';
        } else if (topicCoveragePercentage >= 40 && solveRate >= 0.75) {
            // Practicing: 40%+ of topic covered, 75%+ solved
            level = 'practicing';
        } else if (topicCoveragePercentage >= 15 || topic.totalQuestions >= 3) {
            // Learning: 15%+ of topic covered OR 3+ questions attempted
            level = 'learning';
        }

        return {
            ...topic,
            level,
            solveRate,
            topicCoveragePercentage: Math.round(topicCoveragePercentage),
            totalAvailable,
            progress: {
                completed: topic.solvedQuestions,
                total: topic.totalQuestions,
                percentage: Math.round(solveRate * 100),
                topicCoverage: Math.round(topicCoveragePercentage)
            }
        };
    }).sort((a, b) => {
        // Sort by topic coverage percentage first, then by solve rate
        const aCoverage = a.topicCoveragePercentage;
        const bCoverage = b.topicCoveragePercentage;
        if (aCoverage !== bCoverage) return bCoverage - aCoverage;
        return b.solveRate - a.solveRate;
    });
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
    forceRefreshRecommendations,
    replaceCompletedQuestions
}; 