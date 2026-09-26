import mongoose from 'mongoose';
import { v4 as UUID_V4 } from 'uuid';

const questionSchema = new mongoose.Schema({
    _id: { type: String, default: UUID_V4 },
    domain: {
        type: String,
        enum: ['algorithms', 'system_design', 'frontend'],
        default: 'algorithms',
        required: true,
        index: true
    },
    answerFormat: {
        type: String,
        enum: ['code', 'mcq', 'design_doc'],
        default: 'code',
        required: true
    },
    mcqOptions: [{
        id: { type: String, required: true },
        text: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
        explanation: { type: String, default: '' }
    }],
    designPrompt: {
        scenario: String,
        requirements: [String],
        constraints: [String],
        evaluationCriteria: [String],
        sampleAnswer: String
    },
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
    // Type metadata defined once per question
    types: {
        inputs: {
            type: [String], // Array of input types (ARRAY, TREE, STRING, NUMBER, BOOLEAN, LINKEDLIST, GRAPH)
            required: false,
            enum: ['ARRAY', 'TREE', 'STRING', 'NUMBER', 'BOOLEAN', 'LINKEDLIST', 'GRAPH']
        },
        output: {
            type: String,
            required: false,
            enum: ['ARRAY', 'TREE', 'STRING', 'NUMBER', 'BOOLEAN', 'LINKEDLIST', 'GRAPH']
        }
    },
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

questionSchema.index({ group: 1, difficulty: 1 });
questionSchema.index({ list: 1, difficulty: 1 });
questionSchema.index({ domain: 1, group: 1, difficulty: 1 });
questionSchema.index({ domain: 1, list: 1, difficulty: 1 });

// Update the updatedAt field before saving
questionSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Question = mongoose.model('Question', questionSchema);
export default Question;
