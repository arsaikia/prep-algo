import mongoose from 'mongoose';
import { v4 as UUID_V4 } from 'uuid';

const questionSchema = new mongoose.Schema({
    _id: { type: String, default: UUID_V4 },
    name: {
        type: String,
        required: [true, 'Please add a name'],
        unique: true,
        index: true,
        trim: true
    },
    link: {
        type: String,
        required: [true, 'Please add a link'],
        unique: true,
        trim: true
    },
    group: {
        type: String,
        required: [true, 'Please add a group'],
        index: true,
        trim: true
    },
    difficulty: {
        type: String,
        required: [true, 'Please add a difficulty'],
        enum: ['Easy', 'Medium', 'Hard'],
        index: true,
    },
    description: {
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
    },
    // Updated fields for test cases with array inputs
    exampleTestCases: [{
        inputs: {
            type: [String], // Array of inputs
            required: true,
            validate: [arr => arr.length > 0, 'At least one input is required']
        },
        expectedOutput: {
            type: String,
            required: true
        },
        explanation: {
            type: String,
            default: ''
        }
    }],
    testCases: [{
        inputs: {
            type: [String], // Array of inputs
            required: true,
            validate: [arr => arr.length > 0, 'At least one input is required']
        },
        expectedOutput: {
            type: String,
            required: true
        },
        isHidden: {
            type: Boolean,
            default: true
        }
    }],
    templates: {
        python: {
            type: String,
            required: false,
            default: ''
        },
        javascript: {
            type: String,
            required: false,
            default: ''
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for common query combinations
questionSchema.index({ group: 1, difficulty: 1 });
questionSchema.index({ list: 1, difficulty: 1 });

// Update the updatedAt field before saving
questionSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Question = mongoose.model('Question', questionSchema);
export default Question;
