import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Question from '../models/Question.js';
import SolveHistory from '../models/SolveHistory.js';
import { connectDB } from '../config/db.js';

dotenv.config();

const testUsers = [
    {
        _id: 'test-alice-beginner-001',
        firstName: 'Alice',
        lastName: 'Beginner',
        email: 'test-alice-beginner-001@test.com',
        googleId: 'test-alice-beginner-001-google-id',
        picture: 'https://via.placeholder.com/150/FF6B6B/FFFFFF?text=AB',
        profile: 'beginner' // Just started, mostly easy questions
    },
    {
        _id: 'test-bob-intermediate-002',
        firstName: 'Bob',
        lastName: 'Intermediate',
        email: 'test-bob-intermediate-002@test.com',
        googleId: 'test-bob-intermediate-002-google-id',
        picture: 'https://via.placeholder.com/150/4ECDC4/FFFFFF?text=BI',
        profile: 'intermediate' // Mixed difficulty, some patterns mastered
    },
    {
        _id: 'test-carol-advanced-003',
        firstName: 'Carol',
        lastName: 'Advanced',
        email: 'test-carol-advanced-003@test.com',
        googleId: 'test-carol-advanced-003-google-id',
        picture: 'https://via.placeholder.com/150/45B7D1/FFFFFF?text=CA',
        profile: 'advanced' // Mostly hard questions, comprehensive coverage
    },
    {
        _id: 'test-david-specialized-004',
        firstName: 'David',
        lastName: 'Specialized',
        email: 'test-david-specialized-004@test.com',
        googleId: 'test-david-specialized-004-google-id',
        picture: 'https://via.placeholder.com/150/96CEB4/FFFFFF?text=DS',
        profile: 'specialized' // Strong in some areas, weak in others
    },
    {
        _id: 'test-emma-struggling-005',
        firstName: 'Emma',
        lastName: 'Struggling',
        email: 'test-emma-struggling-005@test.com',
        googleId: 'test-emma-struggling-005-google-id',
        picture: 'https://via.placeholder.com/150/FFEAA7/FFFFFF?text=ES',
        profile: 'struggling' // High retry counts, needs reinforcement
    },
    {
        _id: 'test-user-123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test-user-123@test.com',
        googleId: 'test-user-123-google-id',
        picture: 'https://via.placeholder.com/150/DDA0DD/FFFFFF?text=TU',
        profile: 'comprehensive' // Updated comprehensive history
    }
];

const createTestUsers = async () => {
    try {
        console.log('🚀 Creating Frontend Test Users...');
        console.log('===================================');

        // Connect to database
        await connectDB();

        // Clear existing test users first
        console.log('🧹 Clearing existing test users...');
        await User.deleteMany({ email: { $regex: '@test.com$' } });
        await SolveHistory.deleteMany({ userId: { $regex: /^test-/ } });

        // Get all questions to work with
        const allQuestions = await Question.find().sort({ order: 1 });
        console.log(`📚 Found ${allQuestions.length} questions`);

        if (allQuestions.length === 0) {
            console.log('❌ No questions found in database. Please run syncQuestionsFromJson.js first.');
            process.exit(1);
        }

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
        console.log(`🏷️ Found ${groups.length} question groups:`, groups.slice(0, 5).join(', ') + (groups.length > 5 ? '...' : ''));
        console.log(`📊 Question distribution: Easy: ${questionsByDifficulty.Easy.length}, Medium: ${questionsByDifficulty.Medium.length}, Hard: ${questionsByDifficulty.Hard.length}`);
        console.log('');

        for (const userData of testUsers) {
            console.log(`👤 Creating user: ${userData.firstName} ${userData.lastName} (${userData.profile})`);

            // Create user
            const user = await User.create(userData);
            console.log(`   ✅ User created with ID: ${user._id}`);

            // Generate solve history based on profile
            const solveHistories = [];

            switch (userData.profile) {
                case 'beginner':
                    // Alice: Low completion, mostly easy
                    solveHistories.push(
                        ...generateSolveHistory(user._id, questionsByDifficulty.Easy, 8, 1, 2),
                        ...generateSolveHistory(user._id, questionsByDifficulty.Medium, 2, 2, 4)
                    );
                    break;

                case 'intermediate':
                    // Bob: Medium completion, mixed
                    solveHistories.push(
                        ...generateSolveHistory(user._id, questionsByDifficulty.Easy, 15, 1, 2),
                        ...generateSolveHistory(user._id, questionsByDifficulty.Medium, 12, 1, 3),
                        ...generateSolveHistory(user._id, questionsByDifficulty.Hard, 3, 2, 4)
                    );
                    break;

                case 'advanced':
                    // Carol: High completion, comprehensive
                    solveHistories.push(
                        ...generateSolveHistory(user._id, questionsByDifficulty.Easy, 25, 1, 1),
                        ...generateSolveHistory(user._id, questionsByDifficulty.Medium, 30, 1, 2),
                        ...generateSolveHistory(user._id, questionsByDifficulty.Hard, 15, 1, 3)
                    );
                    break;

                case 'specialized':
                    // David: Uneven across topics
                    const strongGroups = ['Array', 'String', 'Hash Table', 'Two Pointers'].filter(g => groups.includes(g));
                    const weakGroups = ['Tree', 'Graph', 'Dynamic Programming'].filter(g => groups.includes(g));

                    // Strong areas: high solve count, low retry
                    strongGroups.forEach(group => {
                        const groupQuestions = questionsByGroup[group] || [];
                        solveHistories.push(...generateSolveHistory(user._id, groupQuestions, Math.min(groupQuestions.length, 12), 1, 1));
                    });

                    // Weak areas: few questions, high retry count
                    weakGroups.forEach(group => {
                        const groupQuestions = questionsByGroup[group] || [];
                        solveHistories.push(...generateSolveHistory(user._id, groupQuestions, Math.min(groupQuestions.length, 4), 3, 6));
                    });

                    // Fill in with random questions
                    const remainingQuestions = allQuestions.filter(q =>
                        ![...strongGroups, ...weakGroups].includes(q.group)
                    );
                    solveHistories.push(...generateSolveHistory(user._id, remainingQuestions, 8, 1, 3));
                    break;

                case 'struggling':
                    // Emma: High retry counts
                    solveHistories.push(
                        ...generateSolveHistory(user._id, questionsByDifficulty.Easy, 12, 3, 7),
                        ...generateSolveHistory(user._id, questionsByDifficulty.Medium, 5, 4, 8),
                        ...generateSolveHistory(user._id, questionsByDifficulty.Hard, 1, 5, 10)
                    );
                    break;

                case 'comprehensive':
                    // Test User 123: Updated comprehensive history
                    solveHistories.push(
                        ...generateSolveHistory(user._id, questionsByDifficulty.Easy, 30, 1, 2),
                        ...generateSolveHistory(user._id, questionsByDifficulty.Medium, 35, 1, 3),
                        ...generateSolveHistory(user._id, questionsByDifficulty.Hard, 20, 1, 4)
                    );
                    break;
            }

            // Insert solve histories
            if (solveHistories.length > 0) {
                await SolveHistory.insertMany(solveHistories);
                console.log(`   📊 Created ${solveHistories.length} solve history records`);
            }
        }

        console.log('\n🎉 Frontend Test Users Created Successfully!');
        console.log('============================================');

        // Print summary
        console.log('\n📋 SUMMARY:');
        for (const userData of testUsers) {
            const user = await User.findOne({ email: userData.email });
            const solveCount = await SolveHistory.countDocuments({ userId: user._id });
            const successfulSolves = await SolveHistory.countDocuments({
                userId: user._id,
                'solveHistory.success': true
            });
            console.log(`${userData.firstName} ${userData.lastName}: ${solveCount} questions attempted, ${successfulSolves} solved`);
        }

        console.log('\n✅ All test users are ready for frontend testing!');
        console.log('🎯 You can now use the TestUserSelector dropdown in the frontend.');

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