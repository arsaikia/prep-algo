import './retiredMongoScript.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Question from '../models/Question.js';
import { connectDB } from '../config/db.js';

// Load environment variables
dotenv.config();

const groupArg = process.argv.find(arg => arg.startsWith('--group='));
const group = groupArg ? groupArg.split('=')[1] : null;

if (!group) {
    console.log('❌ Please provide a group to delete.');
    console.log('Usage: node scripts/deleteQuestionsByGroup.js --group=Trees');
    process.exit(1);
}

const deleteQuestionsByGroup = async () => {
    try {
        await connectDB();
        console.log(`🗑️  Deleting all questions with group: '${group}'...`);
        const result = await Question.deleteMany({ group });
        console.log(`✅ Deleted ${result.deletedCount} questions with group '${group}'.`);
    } catch (error) {
        console.error('❌ Error deleting questions:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
};

deleteQuestionsByGroup(); 