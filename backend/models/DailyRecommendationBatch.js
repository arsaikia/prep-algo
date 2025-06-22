import mongoose from 'mongoose';
import { v4 as UUID_V4 } from 'uuid';

const dailyRecommendationBatchSchema = new mongoose.Schema({
    _id: { type: String, default: UUID_V4 },
    userId: {
        type: String,
        required: true,
        index: true
    },
    date: {
        type: String, // Store as YYYY-MM-DD string for easy querying
        required: true,
        index: true
    },
    recommendations: [{
        question: {
            type: String,
            ref: 'Question',
            required: true
        },
        reason: {
            type: String,
            required: true
        },
        priority: {
            type: String,
            enum: ['high', 'medium', 'low'],
            required: true
        },
        strategy: {
            type: String,
            enum: ['weak_area_reinforcement', 'progressive_difficulty', 'spaced_repetition', 'topic_exploration', 'general_practice'],
            required: true
        },
        adaptiveContext: {
            weightUsed: Number,
            timeOptimized: String,
            personalizedReason: String,
            isCarriedOver: { type: Boolean, default: false }, // Track if kept from previous batch
            originalBatchTime: Date // When this recommendation was first generated
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    analysis: {
        userLevel: String,
        totalSolved: Number,
        weakAreas: [String],
        strongAreas: [String],
        recentActivity: Number,
        strugglingQuestions: Array,
        adaptiveWeights: Object,
        timePreferences: Object,
        adaptiveFeatures: Object
    },
    generatedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    expiresAt: {
        type: Date,
        default: () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(6, 0, 0, 0); // Expire at 6 AM next day
            return tomorrow;
        },
        index: true
    },
    questionsCompleted: [{
        questionId: String,
        completedAt: Date,
        timeSpent: Number,
        success: Boolean
    }],
    refreshCount: {
        type: Number,
        default: 0
    },
    lastRefreshAt: Date,
    isStale: {
        type: Boolean,
        default: false
    },
    batchType: {
        type: String,
        enum: ['daily', 'refresh', 'bonus', 'selective_refresh'],
        default: 'daily'
    },
    metadata: {
        totalRefreshes: { type: Number, default: 0 },
        questionsCarriedOver: { type: Number, default: 0 },
        questionsReplaced: { type: Number, default: 0 },
        averageTimeToRefresh: Number, // Average time before user requests refresh
        userSatisfactionScore: Number // Based on completion rate
    }
}, {
    timestamps: true
});

// Compound indexes for efficient querying
dailyRecommendationBatchSchema.index({ userId: 1, date: 1 }, { unique: true });
dailyRecommendationBatchSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
dailyRecommendationBatchSchema.index({ userId: 1, generatedAt: -1 });

// Instance methods
dailyRecommendationBatchSchema.methods.shouldRefresh = function (userId) {
    const now = new Date();
    const timeSinceGeneration = now - this.generatedAt;
    const timeSinceLastRefresh = this.lastRefreshAt ? now - this.lastRefreshAt : Infinity;

    // Check if this is a different day (next day refresh logic)
    const batchDate = new Date(this.generatedAt);
    const today = new Date();
    const isDifferentDay = batchDate.toDateString() !== today.toDateString();

    // Refresh conditions
    const conditions = {
        // Only allow refresh if it's a different day AND user made progress
        nextDayWithProgress: isDifferentDay && this.questionsCompleted.length > 0,

        // Allow immediate refresh only if ALL questions completed
        allCompleted: this.questionsCompleted.length >= this.recommendations.length,

        // Batch marked as stale (manual override)
        isStale: this.isStale,

        // Recent refresh cooldown (1 hour)
        recentRefresh: timeSinceLastRefresh < (60 * 60 * 1000),

        // Legacy conditions (for backward compatibility)
        questionsCompleted: this.questionsCompleted.length >= 2,
        timeThreshold: timeSinceGeneration > (6 * 60 * 60 * 1000) // 6 hours
    };

    // NEW HYBRID LOGIC:
    // 1. Same day: Only refresh if ALL completed
    // 2. Next day: Refresh if user made ANY progress (completed 1+ questions)
    // 3. Manual refresh always allowed (via isStale flag)
    // 4. Respect cooldown period
    const shouldRefresh = (
        conditions.nextDayWithProgress ||
        conditions.allCompleted ||
        conditions.isStale
    ) && !conditions.recentRefresh;

    return {
        allowed: shouldRefresh,
        reasons: conditions,
        strategy: isDifferentDay ? 'next_day_refresh' : 'same_day_stable',
        nextRefreshAvailable: conditions.recentRefresh ?
            new Date(this.lastRefreshAt.getTime() + 60 * 60 * 1000) :
            new Date(),
        canReplaceCompleted: this.questionsCompleted.length > 0
    };
};

dailyRecommendationBatchSchema.methods.markQuestionCompleted = function (questionId, completionData = {}) {
    // Remove if already exists (prevent duplicates)
    this.questionsCompleted = this.questionsCompleted.filter(
        q => q.questionId !== questionId
    );

    // Add completion record
    this.questionsCompleted.push({
        questionId,
        completedAt: new Date(),
        timeSpent: completionData.timeSpent || null,
        success: completionData.success !== undefined ? completionData.success : true
    });

    // Update metadata
    this.metadata.userSatisfactionScore = this.questionsCompleted.length / this.recommendations.length;

    return this.save();
};

dailyRecommendationBatchSchema.methods.getProgress = function () {
    const total = this.recommendations.length;
    const completed = this.questionsCompleted.length;
    const remaining = Math.max(0, total - completed);

    return {
        total,
        completed,
        remaining,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        isComplete: completed >= total
    };
};

// Static methods
dailyRecommendationBatchSchema.statics.findTodaysBatch = function (userId) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return this.findOne({ userId, date: today }).populate('recommendations.question');
};

dailyRecommendationBatchSchema.statics.createDailyBatch = async function (userId, recommendations, analysis) {
    const today = new Date().toISOString().split('T')[0];

    // Remove any existing batch for today
    await this.deleteOne({ userId, date: today });

    // Create new batch
    const batch = new this({
        userId,
        date: today,
        recommendations: recommendations.map(rec => ({
            ...rec,
            adaptiveContext: {
                ...rec.adaptiveContext,
                isCarriedOver: false,
                originalBatchTime: new Date()
            }
        })),
        analysis,
        batchType: 'daily'
    });

    return batch.save();
};

dailyRecommendationBatchSchema.statics.cleanupExpiredBatches = function () {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    return this.deleteMany({
        expiresAt: { $lt: new Date() }
    });
};

const DailyRecommendationBatch = mongoose.model('DailyRecommendationBatch', dailyRecommendationBatchSchema);
export default DailyRecommendationBatch; 