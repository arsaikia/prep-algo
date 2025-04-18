import mongoose from 'mongoose';
import { v4 as UUID_V4 } from 'uuid';

const questionSchema = new mongoose.Schema({
    _id: { type: String, default: UUID_V4 },
    name: {
        type: String,
        required: [true, 'Please add a name'],
        unique: true,
        index: true
    },
    link: {
        type: String,
        required: [true, 'Please add a link'],
        unique: true
    },
    group: {
        type: String,
        required: [true, 'Please add a group'],
        index: true
    },
    difficulty: {
        type: String,
        required: [true, 'Please add a difficulty'],
        enum: ['Easy', 'Medium', 'Hard'],
        index: true
    },
    code: {
        type: String,
        required: false,
        trim: true,
    },
    list: {
        type: [String],
        required: [true, 'Please add a list'],
        index: true
    },
    order: {
        type: Number,
        required: [true, 'Please add an order'],
        index: true
    }
});

// Compound index for common query combinations
questionSchema.index({ group: 1, difficulty: 1 });
questionSchema.index({ list: 1, difficulty: 1 });

const Question = mongoose.model('Question', questionSchema);
export default Question;
