import DailyRecommendationBatch from '../models/DailyRecommendationBatch.js';
import SolveHistory from '../models/SolveHistory.js';
import UserProfile from '../models/UserProfile.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import { invalidateUserCache } from '../middleware/cache.js';
import logger from '../config/logger.js';
import { getItemByLegacyId, listItems, toQuestionSummary } from '../utils/contentStore.js';

/*
 * Question metadata comes from the content catalog, never the database. A
 * batch stores only each question's id; the summary clients render is
 * attached at response time from public catalog fields, which is what keeps
 * answer keys and hidden test cases out of recommendation payloads.
 */

/** A recommendation's question id, whether the ref is stored bare or hydrated. */
const recQuestionId = (rec) => {
    const q = rec?.question;
    if (q === null || q === undefined) return undefined;
    return typeof q === 'string' ? q : String(q._id ?? q.id ?? '');
};

/** The public summary for a recommendation's question, or null if it no longer exists. */
const hydrateQuestion = (rec) => toQuestionSummary(getItemByLegacyId(recQuestionId(rec)));

/**
 * Whether an item can be assigned as practice. Problems and quizzes are
 * solved; System Design topics are read in the reader, so they are never
 * handed out as a daily question.
 */
const isRecommendable = (item) =>
    Boolean(item?.legacyId) && (item.type === 'problem' || item.type === 'quiz');

/**
 * In-memory equivalent of the candidate queries the engine used to run
 * against the questions collection: exclude ids, filter by domain, group and
 * difficulty (a list means any of), and take the first `limit` in catalog
 * order. Pure, so the selection rules are testable without a database.
 */
const selectCandidates = (pool, { exclude = [], domain, groups, difficulty, limit = Infinity } = {}) => {
    const excluded = new Set(Array.from(exclude, String));
    const difficulties = difficulty === undefined ? null : [].concat(difficulty);
    const groupSet = groups ? new Set(groups) : null;
    const out = [];
    for (const item of pool) {
        if (out.length >= limit) break;
        if (excluded.has(String(item.legacyId))) continue;
        if (domain && item.domain !== domain) continue;
        if (groupSet && !groupSet.has(item.group)) continue;
        if (difficulties && !difficulties.includes(item.difficulty)) continue;
        out.push(item);
    }
    return out;
};

/*
 * @desc     Get smart daily recommendations with hybrid caching
 * @route    GET /api/v1/recommendations/:userId/daily
 * @access   Private
 */
const getSmartDailyRecommendations = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const { count = 5, forceRefresh = false } = req.query;

    logger.debug({ userId }, 'getting smart recommendations');

    try {
        // Check for existing batch today
        let batch = await DailyRecommendationBatch.findTodaysBatch(userId);

        if (!batch) {
            // No batch exists - create fresh daily batch
            logger.debug('no batch found — creating fresh daily batch');
            batch = await createFreshDailyBatch(userId, parseInt(count));
        } else {
            // Batch exists - check if refresh is needed/allowed
            const refreshCheck = batch.shouldRefresh(userId);

            if (forceRefresh === 'true' || refreshCheck.allowed) {
                logger.debug({ reasons: refreshCheck.reasons }, 'refreshing batch');
                batch = await performSmartRefresh(batch, userId, parseInt(count));
            } else {
                logger.debug({ nextRefresh: refreshCheck.nextRefreshAvailable }, 'serving cached batch');
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
                    const questionId = recQuestionId(rec);
                    const isCompleted = completedQuestionIds.includes(questionId);
                    const completionData = isCompleted ?
                        batch.questionsCompleted.find(q => q.questionId === questionId) : null;

                    return {
                        question: hydrateQuestion(rec),
                        domain: rec.domain || 'algorithms',
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
        logger.error({ err: error }, 'error in smart recommendations');
        return next(new ErrorResponse('Failed to generate smart recommendations', 500));
    }
});

/*
 * @desc     Mark question as completed in daily batch
 * @route    POST /api/v1/recommendations/:userId/complete
 * @access   Private
 */
const markQuestionCompleted = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const { questionId, timeSpent, success = true } = req.body;

    logger.debug({ questionId, userId }, 'marking question completed');

    try {
        // Find today's batch
        const batch = await DailyRecommendationBatch.findTodaysBatch(userId);

        if (!batch) {
            return next(new ErrorResponse('No active daily batch found', 404));
        }

        // Mark question as completed
        await batch.markQuestionCompleted(questionId, { timeSpent, success });
        invalidateUserCache(userId);

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
        logger.error({ err: error }, 'error marking question completed');
        return next(new ErrorResponse('Failed to update completion status', 500));
    }
});

/*
 * @desc     Replace completed questions with fresh ones (keep incomplete)
 * @route    POST /api/v1/recommendations/:userId/replace-completed
 * @access   Private
 */
const replaceCompletedQuestions = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    logger.debug({ userId }, 'replace completed questions requested');

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
                    const questionId = recQuestionId(rec);
                    const isCompleted = completedQuestionIds.includes(questionId);
                    const completionData = isCompleted ?
                        refreshedBatch.questionsCompleted.find(q => q.questionId === questionId) : null;

                    return {
                        question: hydrateQuestion(rec),
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
        logger.error({ err: error }, 'error replacing completed questions');
        return next(new ErrorResponse('Failed to replace completed questions', 500));
    }
});

/*
 * @desc     Force refresh recommendations (with validation)
 * @route    POST /api/v1/recommendations/:userId/refresh
 * @access   Private
 */
const forceRefreshRecommendations = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    logger.debug({ userId }, 'force refresh requested');

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
                    question: hydrateQuestion(rec),
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
        logger.error({ err: error }, 'error in force refresh');
        return next(new ErrorResponse('Failed to refresh recommendations', 500));
    }
});

// Helper Functions

const createFreshDailyBatch = async (userId, count) => {
    logger.debug({ userId }, 'creating fresh daily batch');

    // Get or create user profile
    let userProfile = await UserProfile.findByUserId(userId);
    if (!userProfile) {
        const existingHistory = await SolveHistory.find({ userId });
        userProfile = await UserProfile.createFromSolveHistory(userId, existingHistory);
        await userProfile.save();
    }

    // Get user's solve history (no populate needed — uses denormalized fields)
    const userHistory = await SolveHistory.find({ userId });

    // Analyze patterns with adaptive enhancements
    const analysis = await analyzeUserPatternsAdaptive(userId, userHistory, userProfile);

    // Generate fresh recommendations
    const recommendations = await generateAdaptiveRecommendations(
        userId,
        analysis,
        userProfile,
        count
    );

    // Wire up weight adjustment
    if (userProfile.shouldAdjustWeights()) {
        const successRate = userProfile.recentPerformance.recentSuccessRate;
        const prev = { ...userProfile.adaptiveWeights.toObject() };
        delete prev.adjustmentHistory;

        let reason;
        if (successRate < 0.4) {
            userProfile.adaptiveWeights.weak_area_reinforcement = Math.min(0.7, userProfile.adaptiveWeights.weak_area_reinforcement + 0.05);
            userProfile.adaptiveWeights.progressive_difficulty = Math.max(0.1, userProfile.adaptiveWeights.progressive_difficulty - 0.03);
            userProfile.adaptiveWeights.spaced_repetition = Math.min(0.5, userProfile.adaptiveWeights.spaced_repetition + 0.02);
            reason = 'poor_performance';
        } else {
            userProfile.adaptiveWeights.progressive_difficulty = Math.min(0.6, userProfile.adaptiveWeights.progressive_difficulty + 0.05);
            userProfile.adaptiveWeights.weak_area_reinforcement = Math.max(0.1, userProfile.adaptiveWeights.weak_area_reinforcement - 0.03);
            userProfile.adaptiveWeights.topic_exploration = Math.min(0.2, userProfile.adaptiveWeights.topic_exploration + 0.02);
            reason = 'good_performance';
        }

        // Normalize weights to sum to 1.0
        const sum = userProfile.adaptiveWeights.weak_area_reinforcement +
            userProfile.adaptiveWeights.progressive_difficulty +
            userProfile.adaptiveWeights.spaced_repetition +
            userProfile.adaptiveWeights.topic_exploration +
            userProfile.adaptiveWeights.general_practice;
        for (const key of ['weak_area_reinforcement', 'progressive_difficulty', 'spaced_repetition', 'topic_exploration', 'general_practice']) {
            userProfile.adaptiveWeights[key] = Number((userProfile.adaptiveWeights[key] / sum).toFixed(3));
        }

        userProfile.adaptiveWeights.adjustmentHistory.push({
            previousWeights: prev,
            reason,
            performanceScore: successRate
        });
        userProfile.adaptationMetadata.lastWeightAdjustment = new Date();
        await userProfile.save();
        logger.info({ userId, reason, successRate }, 'adjusted adaptive weights');
    }

    // Build domain distribution for analysis
    const domainDistribution = { algorithms: 0, system_design: 0, frontend: 0 };
    recommendations.forEach(r => { domainDistribution[r.domain || 'algorithms']++; });
    analysis.domainDistribution = domainDistribution;

    // Create and save batch
    const batch = await DailyRecommendationBatch.createDailyBatch(userId, recommendations, analysis);

    logger.debug({ count: recommendations.length }, 'created fresh batch');
    return batch;
};

const performSmartRefresh = async (currentBatch, userId, count) => {
    logger.debug({ userId }, 'performing smart refresh');

    // Get completed question IDs
    const completedQuestionIds = currentBatch.questionsCompleted.map(q => q.questionId);

    // Get remaining recommendations (not completed)
    const remainingRecommendations = currentBatch.recommendations.filter(
        rec => !completedQuestionIds.includes(recQuestionId(rec))
    );

    logger.debug({ remaining: remainingRecommendations.length, completed: completedQuestionIds.length }, 'smart refresh stats');

    // Get fresh analysis (no populate needed — uses denormalized fields)
    const userHistory = await SolveHistory.find({ userId });
    let userProfile = await UserProfile.findByUserId(userId);
    const freshAnalysis = await analyzeUserPatternsAdaptive(userId, userHistory, userProfile);

    // Smart filtering: keep relevant remaining questions
    const relevantRemaining = remainingRecommendations.filter(rec =>
        isStillRelevant(rec, freshAnalysis)
    );

    logger.debug({ relevant: relevantRemaining.length }, 'relevant remaining');

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
        logger.debug({ count: newQuestionsNeeded }, 'generating new questions');

        // Get already recommended question IDs (from current batch + carried over)
        const existingQuestionIds = [
            ...currentBatch.recommendations.map(recQuestionId),
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

    logger.debug({ carriedOver: carriedOverRecommendations.length, new: newRecommendations.length }, 'smart refresh completed');
    return currentBatch;
};

const performSelectiveRefresh = async (currentBatch, userId) => {
    logger.debug({ userId }, 'performing selective refresh');

    // Get user profile and fresh analysis
    let userProfile = await UserProfile.findByUserId(userId);
    if (!userProfile) {
        const existingHistory = await SolveHistory.find({ userId });
        userProfile = await UserProfile.createFromSolveHistory(userId, existingHistory);
        await userProfile.save();
    }

    const userHistory = await SolveHistory.find({ userId });
    const freshAnalysis = await analyzeUserPatternsAdaptive(userId, userHistory, userProfile);

    // Get completed question IDs
    const completedQuestionIds = currentBatch.questionsCompleted.map(q => q.questionId);

    // Separate completed and incomplete recommendations
    const incompleteRecommendations = currentBatch.recommendations.filter(
        rec => !completedQuestionIds.includes(recQuestionId(rec))
    );

    const completedCount = currentBatch.recommendations.length - incompleteRecommendations.length;

    logger.debug({ keeping: incompleteRecommendations.length, replacing: completedCount }, 'selective refresh stats');

    // Generate new questions to replace completed ones
    let newRecommendations = [];
    if (completedCount > 0) {
        // Get all question IDs to exclude (solved + current batch)
        const allExcludedIds = [
            ...await SolveHistory.find({ userId }).distinct('questionId'),
            ...currentBatch.recommendations.map(recQuestionId)
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

    logger.debug({ replaced: completedCount }, 'selective refresh completed');
    return currentBatch;
};

const isStillRelevant = (recommendation, newAnalysis) => {
    const question = hydrateQuestion(recommendation) || {};
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

    const domainStats = {
        algorithms: { groupStats: {}, weakAreas: [], count: 0 },
        system_design: { groupStats: {}, weakAreas: [], count: 0 },
        frontend: { groupStats: {}, weakAreas: [], count: 0 }
    };

    userHistory.forEach(history => {
        // Denormalized on the row; older rows fall back to the catalog.
        const item = history.questionGroup && history.questionDifficulty
            ? null
            : getItemByLegacyId(history.questionId);
        const group = history.questionGroup || item?.group;
        const difficulty = history.questionDifficulty || item?.difficulty;
        const domain = history.domain || 'algorithms';
        if (!group || !difficulty) return;

        // Per-domain tracking
        if (domainStats[domain]) {
            domainStats[domain].count++;
            if (!domainStats[domain].groupStats[group]) {
                domainStats[domain].groupStats[group] = { count: 0, avgSolveCount: 0 };
            }
            domainStats[domain].groupStats[group].count++;
            domainStats[domain].groupStats[group].avgSolveCount += history.solveCount;
        }

        // Standard group and difficulty analysis
        if (!groupStats[group]) {
            groupStats[group] = { count: 0, avgSolveCount: 0 };
        }
        groupStats[group].count++;
        groupStats[group].avgSolveCount += history.solveCount;
        difficultyStats[difficulty]++;

        // Recent activity
        if (history.lastUpdatedAt >= oneWeekAgo) {
            recentActivity.push(history);
        }

        // Struggling questions
        if (history.solveCount > 2 && history.lastUpdatedAt >= oneMonthAgo) {
            strugglingQuestions.push({
                questionId: history.questionId,
                group,
                difficulty,
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
        if (!dailyActivity[dateKey].topics.includes(group)) {
            dailyActivity[dateKey].topics.push(group);
        }
        dailyActivity[dateKey].difficulties[difficulty]++;

        // NEW: Topic mastery tracking
        if (!topicMastery[group]) {
            topicMastery[group] = {
                topic: group,
                totalQuestions: 0,
                solvedQuestions: 0, // Changed: Count all solved questions, not just first-attempt
                difficulties: { Easy: 0, Medium: 0, Hard: 0 },
                averageAttempts: 0,
                firstStudied: history.firstSolvedAt,
                lastStudied: history.lastUpdatedAt
            };
        }

        const topicData = topicMastery[group];
        topicData.totalQuestions++;
        topicData.solvedQuestions++;
        topicData.difficulties[difficulty]++;
        topicData.averageAttempts = (topicData.averageAttempts * (topicData.totalQuestions - 1) + history.solveCount) / topicData.totalQuestions;
        topicData.lastStudied = history.lastUpdatedAt;
    });

    // Calculate averages for standard analysis
    Object.keys(groupStats).forEach(group => {
        groupStats[group].avgSolveCount =
            groupStats[group].avgSolveCount / groupStats[group].count;
    });

    // Calculate per-domain averages and weak areas
    for (const domain of Object.keys(domainStats)) {
        const ds = domainStats[domain];
        Object.keys(ds.groupStats).forEach(group => {
            ds.groupStats[group].avgSolveCount =
                ds.groupStats[group].avgSolveCount / ds.groupStats[group].count;
        });
        ds.weakAreas = Object.entries(ds.groupStats)
            .filter(([, stats]) => stats.count < 3 || stats.avgSolveCount > 2)
            .map(([group]) => group);
    }

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
        },
        domainStats
    };
};

const allocateDomainSlots = (count, domainPreferences, availablePerDomain) => {
    const domains = ['algorithms', 'system_design', 'frontend'];
    const capacityOf = d => (availablePerDomain?.[d] || 0);

    const availableDomains = domains.filter(d => capacityOf(d) > 0);
    if (availableDomains.length === 0) return { algorithms: count };

    // Never promise more questions than actually exist, in total or per domain.
    const totalCapacity = availableDomains.reduce((s, d) => s + capacityOf(d), 0);
    const target = Math.min(count, totalCapacity);

    const slots = {};
    availableDomains.forEach(d => { slots[d] = 0; });

    // Seed one slot per domain so a shallow-but-relevant domain still shows up.
    let assigned = 0;
    for (const d of availableDomains) {
        if (assigned >= target) break;
        slots[d] = 1;
        assigned++;
    }

    // Hand out the remainder to whichever domain is furthest below its weighted
    // share and still has questions left, so the allocation always sums to target.
    const weightOf = d => domainPreferences?.[d]?.weight || (1 / availableDomains.length);
    while (assigned < target) {
        const candidates = availableDomains.filter(d => slots[d] < capacityOf(d));
        if (candidates.length === 0) break;
        candidates.sort((a, b) => (slots[a] / weightOf(a)) - (slots[b] / weightOf(b)));
        slots[candidates[0]]++;
        assigned++;
    }

    Object.keys(slots).forEach(d => { if (slots[d] === 0) delete slots[d]; });
    return slots;
};

const getNextDifficultyAdaptive = (userLevel, difficultyStats) => {
    const total = (difficultyStats.Easy || 0) + (difficultyStats.Medium || 0) + (difficultyStats.Hard || 0);
    if (total === 0) return 'Easy';
    const easyPct = ((difficultyStats.Easy || 0) / total) * 100;
    const medPct = ((difficultyStats.Medium || 0) / total) * 100;

    if (userLevel === 'beginner' && easyPct > 70) return 'Medium';
    if (userLevel === 'intermediate' && medPct > 60) return 'Hard';
    return getDifficultyForLevel(userLevel);
};

const generateAdaptiveRecommendations = async (userId, analysis, userProfile, count, excludeQuestionIds = []) => {
    const recommendations = [];
    const solvedQuestionIds = await SolveHistory.find({ userId }).distinct('questionId');
    const allExcludedIds = [...solvedQuestionIds, ...excludeQuestionIds];
    const usedIds = new Set();

    const weights = userProfile.getAdaptiveWeights();
    const domainPrefs = userProfile.domainPreferences || {};
    const pool = listItems().filter(isRecommendable);

    const availablePerDomain = {};
    for (const domain of ['algorithms', 'system_design', 'frontend']) {
        availablePerDomain[domain] = selectCandidates(pool, { exclude: allExcludedIds, domain }).length;
    }

    const domainSlots = allocateDomainSlots(count, domainPrefs, availablePerDomain);

    const addRec = (question, reason, priority, strategy, weight) => {
        if (usedIds.has(question._id)) return;
        usedIds.add(question._id);
        recommendations.push({
            question,
            domain: question.domain || 'algorithms',
            reason,
            priority,
            strategy,
            adaptiveContext: {
                weightUsed: weight,
                isCarriedOver: false,
                originalBatchTime: new Date()
            }
        });
    };

    for (const [domain, slotCount] of Object.entries(domainSlots)) {
        if (slotCount <= 0) continue;
        const domainExcluded = [...allExcludedIds, ...Array.from(usedIds)];
        let filled = 0;

        // Strategy 1: weak_area_reinforcement
        const weakCount = Math.max(1, Math.ceil(slotCount * weights.weak_area_reinforcement));
        const domainWeakAreas = (analysis.domainStats?.[domain]?.weakAreas || analysis.weakAreas || []);
        if (domainWeakAreas.length > 0) {
            const weakQ = selectCandidates(pool, {
                exclude: domainExcluded,
                domain,
                groups: domainWeakAreas,
                difficulty: getDifficultyForLevel(analysis.userLevel),
                limit: weakCount
            }).map(toQuestionSummary);
            weakQ.forEach(q => {
                if (filled >= slotCount) return;
                addRec(q, `Strengthen weak area: ${q.group}`, 'high', 'weak_area_reinforcement', weights.weak_area_reinforcement);
                filled++;
            });
        }

        // Strategy 2: progressive_difficulty
        const progCount = Math.max(1, Math.ceil(slotCount * weights.progressive_difficulty));
        if (filled < slotCount) {
            const nextDiff = getNextDifficultyAdaptive(analysis.userLevel, analysis.difficultyStats);
            const progQ = selectCandidates(pool, {
                exclude: [...domainExcluded, ...Array.from(usedIds)],
                domain,
                difficulty: nextDiff,
                limit: progCount
            }).map(toQuestionSummary);
            progQ.forEach(q => {
                if (filled >= slotCount) return;
                addRec(q, `Progressive difficulty: ${nextDiff}`, 'medium', 'progressive_difficulty', weights.progressive_difficulty);
                filled++;
            });
        }

        // Strategy 3: spaced_repetition (review solved questions)
        const spacedCount = Math.max(1, Math.ceil(slotCount * weights.spaced_repetition));
        if (filled < slotCount) {
            const solvedInDomain = await SolveHistory.find({
                userId,
                domain,
                solveCount: { $gte: 2 },
                lastUpdatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            })
                .sort({ solveCount: -1, lastUpdatedAt: 1 })
                .limit(spacedCount)
                .select('questionId questionGroup solveCount lastUpdatedAt');

            for (const item of solvedInDomain) {
                if (filled >= slotCount || usedIds.has(item.questionId)) continue;
                const solved = getItemByLegacyId(item.questionId);
                if (!isRecommendable(solved)) continue;
                const q = toQuestionSummary(solved);
                addRec(q, `Review: solved ${item.solveCount} times`, 'high', 'spaced_repetition', weights.spaced_repetition);
                filled++;
            }
        }

        // Strategy 4: topic_exploration
        if (filled < slotCount) {
            const allDomainGroups = [...new Set(
                pool.filter(item => item.domain === domain).map(item => item.group)
            )];
            const solvedGroups = Object.keys(analysis.domainStats?.[domain]?.groupStats || analysis.groupStats || {});
            const unexplored = allDomainGroups.filter(g => !solvedGroups.includes(g) || (analysis.groupStats?.[g]?.count || 0) < 2);

            if (unexplored.length > 0) {
                const exploreQ = selectCandidates(pool, {
                    exclude: [...domainExcluded, ...Array.from(usedIds)],
                    domain,
                    groups: unexplored,
                    difficulty: 'Easy',
                    limit: slotCount - filled
                }).map(toQuestionSummary);
                exploreQ.forEach(q => {
                    if (filled >= slotCount) return;
                    addRec(q, `Explore new topic: ${q.group}`, 'low', 'topic_exploration', weights.topic_exploration);
                    filled++;
                });
            }
        }

        // Strategy 5: general_practice (fill remaining)
        if (filled < slotCount) {
            const fillerQ = selectCandidates(pool, {
                exclude: [...domainExcluded, ...Array.from(usedIds)],
                domain,
                difficulty: getDifficultyForLevel(analysis.userLevel),
                limit: slotCount - filled
            }).map(toQuestionSummary);
            fillerQ.forEach(q => {
                if (filled >= slotCount) return;
                addRec(q, 'Quality practice question', 'medium', 'general_practice', weights.general_practice);
                filled++;
            });
        }
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

/**
 * Questions available per group, summed across domains, for mastery
 * percentages. Counts everything that carries progress — topics included,
 * since solves recorded against them still count toward their group.
 */
const getTopicQuestionCounts = async () => {
    const countMap = {};
    for (const item of listItems()) {
        if (!item.legacyId || item.type === 'module') continue;
        countMap[item.group] = (countMap[item.group] || 0) + 1;
    }
    return countMap;
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

/*
 * @desc     Track recommendation action (attempted/skipped)
 * @route    POST /api/v1/recommendations/:userId/track
 * @access   Private
 */
const trackRecommendationAction = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const { questionId, action, clickedAt } = req.body;

    if (!questionId || !action) {
        return next(new ErrorResponse('questionId and action required', 400));
    }

    const batch = await DailyRecommendationBatch.findTodaysBatch(userId);
    if (!batch) {
        return next(new ErrorResponse('No active daily batch found', 404));
    }

    const rec = batch.recommendations.find(r => recQuestionId(r) === questionId);

    if (!rec) {
        return res.status(404).json({ success: false, message: 'Question not in batch' });
    }

    rec.userAction = action;
    rec.clickedAt = clickedAt ? new Date(clickedAt) : new Date();
    if (!rec.timeToFirstAction) {
        rec.timeToFirstAction = rec.clickedAt - batch.generatedAt;
    }

    await batch.save();

    res.status(200).json({ success: true });
});

export {
    getSmartDailyRecommendations,
    markQuestionCompleted,
    forceRefreshRecommendations,
    replaceCompletedQuestions,
    trackRecommendationAction,
    // Pure helpers exported for unit testing
    allocateDomainSlots,
    getNextDifficultyAdaptive,
    selectCandidates,
    isRecommendable,
    recQuestionId
}; 