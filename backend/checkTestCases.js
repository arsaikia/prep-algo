import mongoose from 'mongoose';
import Question from './models/Question.js';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

const checkTestCases = async () => {
    try {
        await connectDB();

        // Find the Two Sum question
        const twoSumQuestion = await Question.findOne({ link: 'two-sum/' });

        if (!twoSumQuestion) {
            console.log('Two Sum question not found');
            return;
        }

        console.log('=== TWO SUM QUESTION ===');
        console.log('Name:', twoSumQuestion.name);
        console.log('Link:', twoSumQuestion.link);
        console.log('\n=== DESCRIPTION ===');
        console.log(twoSumQuestion.description ? 'Description exists' : 'No description');

        console.log('\n=== EXAMPLE TEST CASES ===');
        console.log('Count:', twoSumQuestion.exampleTestCases?.length || 0);
        if (twoSumQuestion.exampleTestCases) {
            twoSumQuestion.exampleTestCases.forEach((tc, index) => {
                console.log(`\nExample Test Case ${index + 1}:`);
                console.log('  Inputs:', JSON.stringify(tc.inputs));
                console.log('  Expected Output:', JSON.stringify(tc.expectedOutput));
                console.log('  Expected Output Type:', typeof tc.expectedOutput);
                console.log('  Explanation:', tc.explanation || 'None');
            });
        }

        console.log('\n=== ALL TEST CASES ===');
        console.log('Count:', twoSumQuestion.testCases?.length || 0);
        if (twoSumQuestion.testCases) {
            twoSumQuestion.testCases.forEach((tc, index) => {
                console.log(`\nTest Case ${index + 1}:`);
                console.log('  Inputs:', JSON.stringify(tc.inputs));
                console.log('  Expected Output:', JSON.stringify(tc.expectedOutput));
                console.log('  Expected Output Type:', typeof tc.expectedOutput);
                console.log('  Is Hidden:', tc.isHidden);
            });
        }

        console.log('\n=== TEMPLATES ===');
        console.log('Python template exists:', !!twoSumQuestion.templates?.python);
        console.log('JavaScript template exists:', !!twoSumQuestion.templates?.javascript);

        if (twoSumQuestion.templates?.python) {
            console.log('\nPython Template:');
            console.log(twoSumQuestion.templates.python);
        }

    } catch (error) {
        console.error('Error checking test cases:', error);
    } finally {
        mongoose.connection.close();
    }
};

checkTestCases(); 