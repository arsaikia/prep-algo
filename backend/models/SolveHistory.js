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
