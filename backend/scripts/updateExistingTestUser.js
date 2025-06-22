import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Question from './models/Question.js';
import SolveHistory from './models/SolveHistory.js';
import { connectDB } from './config/db.js';

dotenv.config();

// Connect to database
connectDB();

const updateExistingTestUser = async () => {
    try {
        console.log('🔄 Updating existing test user with more solve history...');

        // Find existing test user (assuming there's one with a specific pattern)
        const existingUser = await User.findOne({
            $or: [
                { email: { $regex: 'test' } },
                { firstName: 'Test' },
                { googleId: { $regex: 'test' } }
            ]
        });

        if (!existingUser) {
            console.log('❌ No existing test user found. Creating a new one...');

            // Create a comprehensive test user
            const testUser = await User.create({
                firstName: 'Test',
                lastName: 'User',
                email: 'test.user@example.com',
                googleId: 'test-user-comprehensive-123',
                picture: 'https://via.placeholder.com/150/6C5CE7/FFFFFF?text=TU'
            });

            console.log(`✅ Created new test user: ${testUser._id}`);
            await addComprehensiveSolveHistory(testUser._id);
        } else {
            console.log(`✅ Found existing test user: ${existingUser.firstName} ${existingUser.lastName} (${existingUser._id})`);

            // Clear existing solve history for this user
            await SolveHistory.deleteMany({ userId: existingUser._id });
            console.log('🗑️ Cleared existing solve history');

            // Add comprehensive solve history
            await addComprehensiveSolveHistory(existingUser._id);
        }

        console.log('\n🎉 Test user updated successfully!');

    } catch (error) {
        console.error('❌ Error updating test user:', error);
    } finally {
        mongoose.connection.close();
    }
};

const addComprehensiveSolveHistory = async (userId) => {
    // Get all questions
    const allQuestions = await Question.find().sort({ order: 1 });
    console.log(`📚 Found ${allQuestions.length} questions`);

    // Group questions by difficulty and category
    const questionsByDifficulty = {
        Easy: allQuestions.filter(q => q.difficulty === 'Easy'),
        Medium: allQuestions.filter(q => q.difficulty === 'Medium'),
        Hard: allQuestions.filter(q => q.difficulty === 'Hard')
    };

    const questionsByGroup = {};
    allQuestions.forEach(q => {
        if (!questionsByGroup[q.group]) {
            questionsByGroup[q.group] = [];
        }
        questionsByGroup[q.group].push(q);
    });

    console.log(`📊 Questions by difficulty:`);
    console.log(`   Easy: ${questionsByDifficulty.Easy.length}`);
    console.log(`   Medium: ${questionsByDifficulty.Medium.length}`);
    console.log(`   Hard: ${questionsByDifficulty.Hard.length}`);

    // Create a comprehensive solve history (intermediate-advanced user)
    const solveHistories = [];

    // Add 60% of easy questions (mostly solved once)
    const easyToSolve = Math.floor(questionsByDifficulty.Easy.length * 0.6);
    solveHistories.push(...generateSolveHistory(userId, questionsByDifficulty.Easy, easyToSolve, 1, 2));

    // Add 40% of medium questions (mix of solve counts)
    const mediumToSolve = Math.floor(questionsByDifficulty.Medium.length * 0.4);
    solveHistories.push(...generateSolveHistory(userId, questionsByDifficulty.Medium, mediumToSolve, 1, 3));

    // Add 20% of hard questions (some with multiple attempts)
    const hardToSolve = Math.floor(questionsByDifficulty.Hard.length * 0.2);
    solveHistories.push(...generateSolveHistory(userId, questionsByDifficulty.Hard, hardToSolve, 1, 4));

    // Add some specific patterns for testing recommendations
    const groups = Object.keys(questionsByGroup);

    // Make user strong in some areas (Arrays, Strings)
    const strongGroups = ['Array', 'String'].filter(g => groups.includes(g));
    strongGroups.forEach(group => {
        const groupQuestions = questionsByGroup[group] || [];
        const additionalQuestions = groupQuestions.filter(q =>
            !solveHistories.some(sh => sh.questionId === q._id)
        );
        solveHistories.push(...generateSolveHistory(userId, additionalQuestions, Math.min(additionalQuestions.length, 10), 1, 1));
    });

    // Make user weak in some areas (need more practice)
    const weakGroups = ['Dynamic Programming', 'Graph'].filter(g => groups.includes(g));
    weakGroups.forEach(group => {
        const groupQuestions = questionsByGroup[group] || [];
        const strugglingQuestions = groupQuestions.slice(0, 3); // Only solve a few with high retry count
        solveHistories.push(...generateSolveHistory(userId, strugglingQuestions, strugglingQuestions.length, 3, 6));
    });

    // Insert all solve histories
    if (solveHistories.length > 0) {
        await SolveHistory.insertMany(solveHistories);
        console.log(`📊 Created ${solveHistories.length} solve history records`);

        // Print summary by difficulty
        const easyCount = solveHistories.filter(sh => {
            const question = allQuestions.find(q => q._id === sh.questionId);
            return question && question.difficulty === 'Easy';
        }).length;

        const mediumCount = solveHistories.filter(sh => {
            const question = allQuestions.find(q => q._id === sh.questionId);
            return question && question.difficulty === 'Medium';
        }).length;

        const hardCount = solveHistories.filter(sh => {
            const question = allQuestions.find(q => q._id === sh.questionId);
            return question && question.difficulty === 'Hard';
        }).length;

        console.log(`📈 Solve history summary:`);
        console.log(`   Easy: ${easyCount} questions solved`);
        console.log(`   Medium: ${mediumCount} questions solved`);
        console.log(`   Hard: ${hardCount} questions solved`);
        console.log(`   Total: ${solveHistories.length} questions solved`);
    }
};

// Helper function to generate solve history
const generateSolveHistory = (userId, questions, count, minSolveCount, maxSolveCount) => {
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(count, questions.length));

    return selected.map(question => {
        const solveCount = Math.floor(Math.random() * (maxSolveCount - minSolveCount + 1)) + minSolveCount;
        const firstSolvedAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date within last 30 days
        const lastUpdatedAt = new Date(firstSolvedAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000); // Within a week of first solve

        // Generate solve history array
        const solveHistory = [];
        for (let i = 0; i < solveCount; i++) {
            const solveDate = new Date(firstSolvedAt.getTime() + (i * 24 * 60 * 60 * 1000 * Math.random() * 7));
            solveHistory.push({
                solvedAt: solveDate,
                timeSpent: Math.floor(Math.random() * 60) + 10, // 10-70 minutes
                success: Math.random() > 0.1 // 90% success rate
            });
        }

        return {
            userId,
            questionId: question._id,
            solveCount,
            firstSolvedAt,
            lastUpdatedAt,
            averageTimeToSolve: Math.floor(Math.random() * 45) + 15, // 15-60 minutes
            difficulty_rating: Math.floor(Math.random() * 5) + 1, // 1-5 rating
            tags: generateRandomTags(),
            solveHistory
        };
    });
};

// Helper function to generate random tags
const generateRandomTags = () => {
    const possibleTags = ['tricky', 'review', 'favorite', 'easy', 'hard', 'pattern', 'important'];
    const tagCount = Math.floor(Math.random() * 3); // 0-2 tags
    const shuffled = [...possibleTags].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, tagCount);
};

// Run the script
updateExistingTestUser(); 