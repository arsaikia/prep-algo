import mongoose from 'mongoose';
import { v4 as UUID_V4 } from 'uuid';

const solveHistorySchema = new mongoose.Schema({
    _id: { type: String, default: UUID_V4 },
    userId: {
        type: String,
        default: UUID_V4,
        ref: 'User',
        required: true,
    },
    questionId: {
        type: String,
        default: UUID_V4,
        ref: 'Question',
        required: true,
    },
    solveCount: {
        type: Number,
        required: true,
        trim: true,
    },
    lastUpdatedAt: {
        type: Date,
        default: Date.now,
    },
    note: {
        type: String,
        required: false,
        trim: true,
    },
    // New fields for enhanced recommendations
    firstSolvedAt: {
        type: Date,
        default: Date.now,
    },
    averageTimeToSolve: {
        type: Number, // in minutes
        required: false,
    },
    difficulty_rating: {
        type: Number, // User's personal difficulty rating 1-5
        min: 1,
        max: 5,
        required: false,
    },
    tags: [{
        type: String,
        trim: true,
    }], // User-defined tags like "tricky", "review", "favorite"
    solveHistory: [{
        solvedAt: {
            type: Date,
            default: Date.now,
        },
        timeSpent: {
            type: Number, // in minutes
            required: false,
        },
        success: {
            type: Boolean,
            default: true,
        },
        // NEW FIELDS for Phase 1 adaptive recommendations
        sessionContext: {
            timeOfDay: {
                type: String,
                enum: ['morning', 'afternoon', 'evening'],
                default: function () {
                    const hour = new Date().getHours();
                    if (hour >= 5 && hour < 12) return 'morning';
                    if (hour >= 12 && hour < 18) return 'afternoon';
                    return 'evening';
                }
            },
            dayOfWeek: {
                type: String,
                enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                default: function () {
                    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                    return days[new Date().getDay()];
                }
            },
            sessionNumber: {
                type: Number,
                default: 1 // 1st, 2nd, 3rd question in this session
            },
            previousQuestionResult: {
                type: Boolean,
                required: false // Success of previous question in this session
            },
            recommendationStrategy: {
                type: String,
                enum: ['weak_area_reinforcement', 'progressive_difficulty', 'spaced_repetition', 'topic_exploration', 'general_practice'],
                required: false // Which strategy recommended this question
            }
        }
    }]
});

// Create compound index for faster queries
solveHistorySchema.index({ userId: 1, questionId: 1 }, { unique: true });
solveHistorySchema.index({ userId: 1, lastUpdatedAt: -1 });
solveHistorySchema.index({ userId: 1, 'solveHistory.solvedAt': -1 });

// Pre-save middleware to update firstSolvedAt
solveHistorySchema.pre('save', function (next) {
    if (this.isNew) {
        this.firstSolvedAt = new Date();
    }
    next();
});

const SolveHistory = mongoose.model('SolveHistory', solveHistorySchema);
export default SolveHistory;
