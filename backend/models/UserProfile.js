import mongoose from 'mongoose';
import { v4 as UUID_V4 } from 'uuid';

const userProfileSchema = new mongoose.Schema({
    _id: { type: String, default: UUID_V4 },
    userId: {
        type: String,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },

    // Learning Velocity Tracking (Phase 1 - Basic)
    learningVelocity: {
        questionsPerWeek: { type: Number, default: 0 },
        lastWeekCount: { type: Number, default: 0 },
        improvementTrend: { type: String, enum: ['improving', 'stable', 'declining'], default: 'stable' },
        weeklyHistory: [{
            weekStartDate: Date,
            questionsCompleted: Number,
            averageSuccessRate: Number
        }]
    },

    // Time-based Learning Preferences (Phase 1)
    timePreferences: {
        morningPerformance: {
            averageSuccessRate: { type: Number, default: 0.5 },
            averageTimePerQuestion: { type: Number, default: 15 },
            sessionCount: { type: Number, default: 0 }
        },
        afternoonPerformance: {
            averageSuccessRate: { type: Number, default: 0.5 },
            averageTimePerQuestion: { type: Number, default: 15 },
            sessionCount: { type: Number, default: 0 }
        },
        eveningPerformance: {
            averageSuccessRate: { type: Number, default: 0.5 },
            averageTimePerQuestion: { type: Number, default: 15 },
            sessionCount: { type: Number, default: 0 }
        },
        optimalTimeOfDay: { type: String, enum: ['morning', 'afternoon', 'evening'], default: 'morning' }
    },

    // Adaptive Strategy Weights (Phase 1 - Core Feature)
    adaptiveWeights: {
        weak_area_reinforcement: { type: Number, default: 0.4, min: 0.1, max: 0.7 },
        progressive_difficulty: { type: Number, default: 0.3, min: 0.1, max: 0.6 },
        spaced_repetition: { type: Number, default: 0.2, min: 0.1, max: 0.5 },
        topic_exploration: { type: Number, default: 0.07, min: 0.05, max: 0.2 },
        general_practice: { type: Number, default: 0.03, min: 0.02, max: 0.1 },

        // Track weight adjustment history
        adjustmentHistory: [{
            date: { type: Date, default: Date.now },
            previousWeights: {
                weak_area_reinforcement: Number,
                progressive_difficulty: Number,
                spaced_repetition: Number,
                topic_exploration: Number,
                general_practice: Number
            },
            reason: { type: String, enum: ['poor_performance', 'good_performance', 'user_preference', 'plateau_detected'] },
            performanceScore: Number // 0-1 scale of how well previous weights worked
        }]
    },

    // Recent Performance Tracking (Phase 1)
    recentPerformance: {
        last10Questions: [{
            questionId: String,
            success: Boolean,
            timeSpent: Number,
            difficulty: String,
            solvedAt: Date,
            strategy: String // Which strategy recommended this question
        }],
        currentStreak: {
            type: { type: String, enum: ['success', 'failure'], default: 'success' },
            count: { type: Number, default: 0 },
            startDate: Date
        },
        recentSuccessRate: { type: Number, default: 0.5 }, // Last 10 questions
        performanceTrend: { type: String, enum: ['improving', 'stable', 'declining'], default: 'stable' }
    },

    // Session Context Tracking (Phase 1)
    sessionPatterns: {
        averageSessionLength: { type: Number, default: 30 }, // minutes
        questionsPerSession: { type: Number, default: 3 },
        optimalBatchSize: { type: Number, default: 3 }, // questions before taking a break
        lastSessionDate: Date,
        sessionFrequency: { type: Number, default: 3 } // sessions per week
    },

    // Adaptation Metadata
    adaptationMetadata: {
        lastAnalyzed: { type: Date, default: Date.now },
        lastWeightAdjustment: Date,
        adaptationEnabled: { type: Boolean, default: true },
        dataQuality: {
            hasSufficientData: { type: Boolean, default: false }, // At least 20 questions solved
            lastQualityCheck: Date
        },
        version: { type: String, default: '1.0' }
    },

    // Quick access computed fields (updated by background job)
    computedMetrics: {
        overallSuccessRate: { type: Number, default: 0.5 },
        averageTimePerQuestion: { type: Number, default: 15 },
        strongestTimeOfDay: String,
        weakestTopics: [String],
        readyForAdvancement: { type: Boolean, default: false }
    }
}, {
    timestamps: true
});

// Compound indexes for performance
userProfileSchema.index({ userId: 1 });
userProfileSchema.index({ 'adaptationMetadata.lastAnalyzed': -1 });
userProfileSchema.index({ 'learningVelocity.questionsPerWeek': -1 });
userProfileSchema.index({ 'adaptationMetadata.dataQuality.hasSufficientData': 1 });

// Instance methods
userProfileSchema.methods.updateRecentPerformance = function (questionResult) {
    // Add to last10Questions array
    this.recentPerformance.last10Questions.push({
        questionId: questionResult.questionId,
        success: questionResult.success,
        timeSpent: questionResult.timeSpent,
        difficulty: questionResult.difficulty,
        solvedAt: new Date(),
        strategy: questionResult.strategy
    });

    // Keep only last 10
    if (this.recentPerformance.last10Questions.length > 10) {
        this.recentPerformance.last10Questions.shift();
    }

    // Update success rate
    const successCount = this.recentPerformance.last10Questions.filter(q => q.success).length;
    this.recentPerformance.recentSuccessRate = successCount / this.recentPerformance.last10Questions.length;

    // Update streak
    if (questionResult.success) {
        if (this.recentPerformance.currentStreak.type === 'success') {
            this.recentPerformance.currentStreak.count++;
        } else {
            this.recentPerformance.currentStreak = {
                type: 'success',
                count: 1,
                startDate: new Date()
            };
        }
    } else {
        if (this.recentPerformance.currentStreak.type === 'failure') {
            this.recentPerformance.currentStreak.count++;
        } else {
            this.recentPerformance.currentStreak = {
                type: 'failure',
                count: 1,
                startDate: new Date()
            };
        }
    }
};

userProfileSchema.methods.getAdaptiveWeights = function () {
    // If not enough data, use defaults
    if (!this.adaptationMetadata.dataQuality.hasSufficientData) {
        return {
            weak_area_reinforcement: 0.4,
            progressive_difficulty: 0.3,
            spaced_repetition: 0.2,
            topic_exploration: 0.07,
            general_practice: 0.03
        };
    }

    return {
        weak_area_reinforcement: this.adaptiveWeights.weak_area_reinforcement,
        progressive_difficulty: this.adaptiveWeights.progressive_difficulty,
        spaced_repetition: this.adaptiveWeights.spaced_repetition,
        topic_exploration: this.adaptiveWeights.topic_exploration,
        general_practice: this.adaptiveWeights.general_practice
    };
};

userProfileSchema.methods.shouldAdjustWeights = function () {
    // Don't adjust if not enough data
    if (!this.adaptationMetadata.dataQuality.hasSufficientData) {
        return false;
    }

    // Don't adjust too frequently (at least 1 week between adjustments)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (this.adaptationMetadata.lastWeightAdjustment &&
        this.adaptationMetadata.lastWeightAdjustment > oneWeekAgo) {
        return false;
    }

    // Adjust if performance is poor (< 40% success rate) or very good (> 80%)
    const successRate = this.recentPerformance.recentSuccessRate;
    return successRate < 0.4 || successRate > 0.8;
};

// Static methods
userProfileSchema.statics.findByUserId = function (userId) {
    return this.findOne({ userId });
};

userProfileSchema.statics.createFromSolveHistory = async function (userId, solveHistory) {
    // Calculate initial metrics from existing solve history
    const totalQuestions = solveHistory.length;
    const recentQuestions = solveHistory
        .sort((a, b) => new Date(b.lastUpdatedAt) - new Date(a.lastUpdatedAt))
        .slice(0, 10);

    const successRate = recentQuestions.length > 0 ?
        recentQuestions.filter(q => q.solveCount === 1).length / recentQuestions.length : 0.5;

    const avgTime = recentQuestions.length > 0 ?
        recentQuestions.reduce((sum, q) => sum + (q.averageTimeToSolve || 15), 0) / recentQuestions.length : 15;

    // Calculate weekly velocity
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentWeekQuestions = solveHistory.filter(q =>
        new Date(q.lastUpdatedAt) > oneWeekAgo
    ).length;

    const profile = new this({
        userId,
        learningVelocity: {
            questionsPerWeek: recentWeekQuestions,
            lastWeekCount: recentWeekQuestions
        },
        recentPerformance: {
            recentSuccessRate: successRate,
            last10Questions: recentQuestions.map(q => ({
                questionId: q.questionId,
                success: q.solveCount === 1,
                timeSpent: q.averageTimeToSolve || 15,
                difficulty: q.questionId?.difficulty || 'Medium',
                solvedAt: q.lastUpdatedAt,
                strategy: 'general_practice'
            }))
        },
        computedMetrics: {
            overallSuccessRate: successRate,
            averageTimePerQuestion: avgTime
        },
        adaptationMetadata: {
            dataQuality: {
                hasSufficientData: totalQuestions >= 20
            }
        }
    });

    return profile;
};

const UserProfile = mongoose.model('UserProfile', userProfileSchema);
export default UserProfile; 