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
});

// Create compound index for faster queries
solveHistorySchema.index({ userId: 1, questionId: 1 }, { unique: true });

const SolveHistory = mongoose.model('SolveHistory', solveHistorySchema);
export default SolveHistory;
