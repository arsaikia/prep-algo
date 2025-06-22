import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Question from './models/Question.js';
import SolveHistory from './models/SolveHistory.js';
import { connectDB } from './config/db.js';

dotenv.config();

// Connect to database
connectDB();

const testUsers = [
    {
        _id: 'test-alice-beginner-001',
        firstName: 'Alice',
        lastName: 'Beginner',
        email: 'alice.beginner@test.com',
        googleId: 'alice-beginner-123',
        picture: 'https://via.placeholder.com/150/FF6B6B/FFFFFF?text=AB',
        profile: 'beginner' // Just started, mostly easy questions
    },
    {
        _id: 'test-bob-intermediate-002',
        firstName: 'Bob',
        lastName: 'Intermediate',
        email: 'bob.intermediate@test.com',
        googleId: 'bob-intermediate-456',
        picture: 'https://via.placeholder.com/150/4ECDC4/FFFFFF?text=BI',
        profile: 'intermediate' // Mixed difficulty, some patterns mastered
    },
    {
        _id: 'test-carol-advanced-003',
        firstName: 'Carol',
        lastName: 'Advanced',
        email: 'carol.advanced@test.com',
        googleId: 'carol-advanced-789',
        picture: 'https://via.placeholder.com/150/45B7D1/FFFFFF?text=CA',
        profile: 'advanced' // Mostly hard questions, comprehensive coverage
    },
    {
        _id: 'test-david-specialized-004',
        firstName: 'David',
        lastName: 'Specialized',
        email: 'david.specialized@test.com',
        googleId: 'david-specialized-012',
        picture: 'https://via.placeholder.com/150/96CEB4/FFFFFF?text=DS',
        profile: 'specialized' // Strong in some areas, weak in others
    },
    {
        _id: 'test-emma-struggling-005',
        firstName: 'Emma',
        lastName: 'Struggling',
        email: 'emma.struggling@test.com',
        googleId: 'emma-struggling-345',
        picture: 'https://via.placeholder.com/150/FFEAA7/FFFFFF?text=ES',
        profile: 'struggling' // High retry counts, needs reinforcement
    }
];

const createTestUsers = async () => {
    try {
        console.log('🚀 Creating test users...');

        // Clear existing test users
        await User.deleteMany({ email: { $regex: '@test.com$' } });
        const existingTestUserIds = await User.find({ email: { $regex: '@test.com$' } }).distinct('_id');
        await SolveHistory.deleteMany({ userId: { $in: existingTestUserIds } });

        // Get all questions to work with
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

        const groups = Object.keys(questionsByGroup);
        console.log(`🏷️ Found ${groups.length} question groups:`, groups);

        for (const userData of testUsers) {
            console.log(`\n👤 Creating user: ${userData.firstName} ${userData.lastName} (${userData.profile})`);

            // Create user
            const user = await User.create(userData);
            console.log(`✅ User created with ID: ${user._id}`);

            // Generate solve history based on profile
            const solveHistories = [];

            switch (userData.profile) {
                case 'beginner':
                    // Alice: 15-20 easy questions, 3-5 medium, 0-1 hard
                    solveHistories.push(
                        ...generateSolveHistory(user._id, questionsByDifficulty.Easy, 18, 1, 1),
                        ...generateSolveHistory(user._id, questionsByDifficulty.Medium, 4, 1, 2),
                        ...generateSolveHistory(user._id, questionsByDifficulty.Hard, 1, 2, 3)
                    );
                    break;

                case 'intermediate':
                    // Bob: 25-30 easy, 15-20 medium, 5-8 hard
                    solveHistories.push(
                        ...generateSolveHistory(user._id, questionsByDifficulty.Easy, 28, 1, 1),
                        ...generateSolveHistory(user._id, questionsByDifficulty.Medium, 18, 1, 2),
                        ...generateSolveHistory(user._id, questionsByDifficulty.Hard, 7, 1, 3)
                    );
                    break;

                case 'advanced':
                    // Carol: 40+ easy, 30+ medium, 20+ hard
                    solveHistories.push(
                        ...generateSolveHistory(user._id, questionsByDifficulty.Easy, 45, 1, 1),
                        ...generateSolveHistory(user._id, questionsByDifficulty.Medium, 35, 1, 2),
                        ...generateSolveHistory(user._id, questionsByDifficulty.Hard, 25, 1, 2)
                    );
                    break;

                case 'specialized':
                    // David: Strong in Arrays/Strings, weak in Trees/Graphs
                    const strongGroups = ['Array', 'String', 'Hash Table', 'Two Pointers'].filter(g => groups.includes(g));
                    const weakGroups = ['Tree', 'Graph', 'Dynamic Programming'].filter(g => groups.includes(g));

                    // Strong areas: high solve count
                    strongGroups.forEach(group => {
                        const groupQuestions = questionsByGroup[group] || [];
                        solveHistories.push(...generateSolveHistory(user._id, groupQuestions, Math.min(groupQuestions.length, 15), 1, 1));
                    });

                    // Weak areas: few questions, high retry count
                    weakGroups.forEach(group => {
                        const groupQuestions = questionsByGroup[group] || [];
                        solveHistories.push(...generateSolveHistory(user._id, groupQuestions, Math.min(groupQuestions.length, 3), 3, 5));
                    });
                    break;

                case 'struggling':
                    // Emma: Lower question count but high retry rates
                    solveHistories.push(
                        ...generateSolveHistory(user._id, questionsByDifficulty.Easy, 12, 2, 4),
                        ...generateSolveHistory(user._id, questionsByDifficulty.Medium, 6, 3, 6),
                        ...generateSolveHistory(user._id, questionsByDifficulty.Hard, 2, 4, 8)
                    );
                    break;
            }

            // Insert solve histories
            if (solveHistories.length > 0) {
                await SolveHistory.insertMany(solveHistories);
                console.log(`📊 Created ${solveHistories.length} solve history records`);
            }
        }

        console.log('\n🎉 Test users created successfully!');

        // Print summary
        console.log('\n📋 Summary:');
        for (const userData of testUsers) {
            const user = await User.findOne({ email: userData.email });
            const solveCount = await SolveHistory.countDocuments({ userId: user._id });
            console.log(`${userData.firstName} ${userData.lastName}: ${solveCount} questions solved`);
        }

    } catch (error) {
        console.error('❌ Error creating test users:', error);
    } finally {
        mongoose.connection.close();
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
createTestUsers(); 