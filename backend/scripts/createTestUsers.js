import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Question from '../models/Question.js';
import SolveHistory from '../models/SolveHistory.js';
import UserProfile from '../models/UserProfile.js';
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
        profile: 'beginner' // Just started, mostly easy questions, inconsistent
    },
    {
        _id: 'test-bob-intermediate-002',
        firstName: 'Bob',
        lastName: 'Intermediate',
        email: 'test-bob-intermediate-002@test.com',
        googleId: 'test-bob-intermediate-002-google-id',
        picture: 'https://via.placeholder.com/150/4ECDC4/FFFFFF?text=BI',
        profile: 'intermediate' // Mixed difficulty, some topics mastered, consistent learner
    },
    {
        _id: 'test-carol-advanced-003',
        firstName: 'Carol',
        lastName: 'Advanced',
        email: 'test-carol-advanced-003@test.com',
        googleId: 'test-carol-advanced-003-google-id',
        picture: 'https://via.placeholder.com/150/45B7D1/FFFFFF?text=CA',
        profile: 'advanced' // High coverage across topics, multiple mastered areas
    },
    {
        _id: 'test-david-specialized-004',
        firstName: 'David',
        lastName: 'Specialized',
        email: 'test-david-specialized-004@test.com',
        googleId: 'test-david-specialized-004-google-id',
        picture: 'https://via.placeholder.com/150/96CEB4/FFFFFF?text=DS',
        profile: 'specialized' // Expert in some areas, complete beginner in others
    },
    {
        _id: 'test-emma-struggling-005',
        firstName: 'Emma',
        lastName: 'Struggling',
        email: 'test-emma-struggling-005@test.com',
        googleId: 'test-emma-struggling-005-google-id',
        picture: 'https://via.placeholder.com/150/FFEAA7/FFFFFF?text=ES',
        profile: 'struggling' // High retry counts, needs spaced repetition
    },
    {
        _id: 'test-user-123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test-user-123@test.com',
        googleId: 'test-user-123-google-id',
        picture: 'https://via.placeholder.com/150/DDA0DD/FFFFFF?text=TU',
        profile: 'comprehensive' // Comprehensive test case for all features
    }
];

// Learning progression scenarios for realistic testing
const learningScenarios = {
    beginner: {
        description: 'New learner, basic patterns, inconsistent progress',
        totalQuestions: 20,
        topicProgression: {
            'Two Pointers': { questions: 2, efficiency: 'poor', coverage: 40 }, // 2/5 = 40%
            'Arrays & Hashing': { questions: 5, efficiency: 'poor', coverage: 42 }, // 5/12 = 42%
            'Stack': { questions: 3, efficiency: 'average', coverage: 38 }, // 3/8 = 38%
            'String': { questions: 2, efficiency: 'poor', coverage: 100 }, // 2/2 = 100%
            'Linked List': { questions: 4, efficiency: 'poor', coverage: 33 }, // 4/12 = 33%
            'Binary Search': { questions: 2, efficiency: 'poor', coverage: 25 }, // 2/8 = 25%
            'Trees': { questions: 2, efficiency: 'poor', coverage: 6 } // 2/36 = 6%
        },
        streakPattern: 'inconsistent', // 0-2 day streaks
        difficultyDistribution: { Easy: 85, Medium: 15, Hard: 0 }
    },

    intermediate: {
        description: 'Consistent learner, some topics mastered, balanced approach',
        totalQuestions: 45,
        topicProgression: {
            'Two Pointers': { questions: 4, efficiency: 'excellent', coverage: 80 }, // 4/5 = 80% → MASTERED
            'Sliding Window': { questions: 4, efficiency: 'good', coverage: 67 }, // 4/6 = 67% → PROFICIENT
            'Arrays & Hashing': { questions: 8, efficiency: 'good', coverage: 67 }, // 8/12 = 67% → PROFICIENT
            'Stack': { questions: 6, efficiency: 'average', coverage: 75 }, // 6/8 = 75% → PRACTICING
            'Binary Search': { questions: 5, efficiency: 'good', coverage: 63 }, // 5/8 = 63% → PROFICIENT
            'Linked List': { questions: 6, efficiency: 'average', coverage: 50 }, // 6/12 = 50% → PRACTICING
            'Trees': { questions: 8, efficiency: 'average', coverage: 22 }, // 8/36 = 22% → LEARNING
            'Graphs': { questions: 4, efficiency: 'poor', coverage: 19 } // 4/21 = 19% → LEARNING
        },
        streakPattern: 'consistent', // 3-7 day streaks
        difficultyDistribution: { Easy: 60, Medium: 35, Hard: 5 }
    },

    advanced: {
        description: 'Experienced coder, multiple mastered topics, tackles hard problems',
        totalQuestions: 85,
        topicProgression: {
            'Two Pointers': { questions: 5, efficiency: 'excellent', coverage: 100 }, // 5/5 = 100% → MASTERED
            'Bit Manipulation': { questions: 6, efficiency: 'excellent', coverage: 86 }, // 6/7 = 86% → MASTERED
            'Sliding Window': { questions: 5, efficiency: 'excellent', coverage: 83 }, // 5/6 = 83% → MASTERED
            'Binary Search': { questions: 7, efficiency: 'good', coverage: 88 }, // 7/8 = 88% → MASTERED
            'Arrays & Hashing': { questions: 10, efficiency: 'good', coverage: 83 }, // 10/12 = 83% → MASTERED
            'Stack': { questions: 6, efficiency: 'good', coverage: 75 }, // 6/8 = 75% → PRACTICING
            'Linked List': { questions: 8, efficiency: 'good', coverage: 67 }, // 8/12 = 67% → PROFICIENT
            'Trees': { questions: 16, efficiency: 'average', coverage: 44 }, // 16/36 = 44% → PRACTICING
            'Graphs': { questions: 8, efficiency: 'average', coverage: 38 }, // 8/21 = 38% → LEARNING
            'Backtracking': { questions: 4, efficiency: 'average', coverage: 40 }, // 4/10 = 40% → PRACTICING
            '1-D Dynamic Programming': { questions: 6, efficiency: 'poor', coverage: 50 }, // 6/12 = 50% → PRACTICING
            'Greedy': { questions: 2, efficiency: 'poor', coverage: 25 }, // 2/8 = 25% → LEARNING
            'Heap / Priority Queue': { questions: 2, efficiency: 'poor', coverage: 29 } // 2/7 = 29% → LEARNING
        },
        streakPattern: 'long', // 5-15 day streaks
        difficultyDistribution: { Easy: 30, Medium: 50, Hard: 20 }
    },

    specialized: {
        description: 'Domain expert - mastered some areas completely, untouched others',
        totalQuestions: 55,
        topicProgression: {
            'Two Pointers': { questions: 5, efficiency: 'perfect', coverage: 100 }, // 5/5 = 100% → MASTERED
            'Sliding Window': { questions: 6, efficiency: 'perfect', coverage: 100 }, // 6/6 = 100% → MASTERED
            'Binary Search': { questions: 8, efficiency: 'excellent', coverage: 100 }, // 8/8 = 100% → MASTERED
            'Arrays & Hashing': { questions: 12, efficiency: 'excellent', coverage: 100 }, // 12/12 = 100% → MASTERED

            'Trees': { questions: 3, efficiency: 'terrible', coverage: 8 }, // 3/36 = 8% → BEGINNER
            'Graphs': { questions: 2, efficiency: 'terrible', coverage: 10 }, // 2/21 = 10% → BEGINNER
            'Dynamic Programming': { questions: 1, efficiency: 'terrible', coverage: 8 }, // 1/12 = 8% → BEGINNER
            'Backtracking': { questions: 1, efficiency: 'terrible', coverage: 10 }, // 1/10 = 10% → BEGINNER

            'Stack': { questions: 5, efficiency: 'good', coverage: 63 }, // 5/8 = 63% → PROFICIENT
            'Linked List': { questions: 7, efficiency: 'average', coverage: 58 }, // 7/12 = 58% → PRACTICING
            'String': { questions: 2, efficiency: 'good', coverage: 100 }, // 2/2 = 100% → PROFICIENT
            'Bit Manipulation': { questions: 3, efficiency: 'average', coverage: 43 } // 3/7 = 43% → PRACTICING
        },
        streakPattern: 'sporadic', // Intense bursts then gaps
        difficultyDistribution: { Easy: 40, Medium: 45, Hard: 15 }
    },

    struggling: {
        description: 'Needs help - high retry counts, should trigger spaced repetition',
        totalQuestions: 25,
        topicProgression: {
            'Arrays & Hashing': { questions: 6, efficiency: 'terrible', coverage: 50 }, // 6/12 = 50%
            'Two Pointers': { questions: 3, efficiency: 'terrible', coverage: 60 }, // 3/5 = 60%
            'Stack': { questions: 4, efficiency: 'terrible', coverage: 50 }, // 4/8 = 50%
            'String': { questions: 2, efficiency: 'terrible', coverage: 100 }, // 2/2 = 100%
            'Linked List': { questions: 5, efficiency: 'terrible', coverage: 42 }, // 5/12 = 42%
            'Binary Search': { questions: 3, efficiency: 'terrible', coverage: 38 }, // 3/8 = 38%
            'Trees': { questions: 2, efficiency: 'terrible', coverage: 6 } // 2/36 = 6%
        },
        streakPattern: 'broken', // Frequent interruptions
        difficultyDistribution: { Easy: 80, Medium: 20, Hard: 0 }
    },

    comprehensive: {
        description: 'Test all features - varied progression across all topics',
        totalQuestions: 95,
        topicProgression: {
            'Two Pointers': { questions: 4, efficiency: 'excellent', coverage: 80 }, // 4/5 = 80% → MASTERED
            'Bit Manipulation': { questions: 5, efficiency: 'excellent', coverage: 71 }, // 5/7 = 71% → MASTERED (if efficiency good)

            'Sliding Window': { questions: 4, efficiency: 'good', coverage: 67 }, // 4/6 = 67% → PROFICIENT
            'Binary Search': { questions: 5, efficiency: 'good', coverage: 63 }, // 5/8 = 63% → PROFICIENT
            'Arrays & Hashing': { questions: 8, efficiency: 'good', coverage: 67 }, // 8/12 = 67% → PROFICIENT

            'Stack': { questions: 6, efficiency: 'average', coverage: 75 }, // 6/8 = 75% → PRACTICING
            'Linked List': { questions: 6, efficiency: 'average', coverage: 50 }, // 6/12 = 50% → PRACTICING
            'Trees': { questions: 16, efficiency: 'average', coverage: 44 }, // 16/36 = 44% → PRACTICING
            'Intervals': { questions: 3, efficiency: 'average', coverage: 50 }, // 3/6 = 50% → PRACTICING
            'String': { questions: 2, efficiency: 'average', coverage: 100 }, // 2/2 = 100% → PRACTICING

            'Graphs': { questions: 8, efficiency: 'poor', coverage: 38 }, // 8/21 = 38% → LEARNING
            'Backtracking': { questions: 4, efficiency: 'poor', coverage: 40 }, // 4/10 = 40% → LEARNING
            'Heap / Priority Queue': { questions: 2, efficiency: 'poor', coverage: 29 }, // 2/7 = 29% → LEARNING
            'Tries': { questions: 1, efficiency: 'poor', coverage: 33 }, // 1/3 = 33% → LEARNING

            '1-D Dynamic Programming': { questions: 2, efficiency: 'poor', coverage: 17 }, // 2/12 = 17% → WEAK
            '2-D Dynamic Programming': { questions: 1, efficiency: 'terrible', coverage: 9 }, // 1/11 = 9% → WEAK
            'Greedy': { questions: 2, efficiency: 'poor', coverage: 25 }, // 2/8 = 25% → WEAK
            'Math & Geometry': { questions: 1, efficiency: 'terrible', coverage: 13 }, // 1/8 = 13% → WEAK
            'Advanced Graphs': { questions: 1, efficiency: 'terrible', coverage: 14 } // 1/7 = 14% → WEAK
        },
        streakPattern: 'variable', // Mix of consistent and inconsistent
        difficultyDistribution: { Easy: 35, Medium: 45, Hard: 20 }
    }
};

// Efficiency mappings to attempt counts
const efficiencyToAttempts = {
    perfect: { min: 1, max: 1 },      // Always first try
    excellent: { min: 1, max: 2 },   // Mostly first try, occasional second
    good: { min: 1, max: 3 },        // 1-3 attempts average
    average: { min: 2, max: 4 },     // 2-4 attempts average  
    poor: { min: 3, max: 6 },        // 3-6 attempts average
    terrible: { min: 4, max: 8 },    // 4-8 attempts average
};

const createTestUsers = async () => {
    try {
        console.log('🚀 Creating Enhanced Test Users with Learning Progression...');
        console.log('===========================================================');

        // Connect to database
        await connectDB();

        // Clear existing test users first
        console.log('🧹 Clearing existing test users...');
        await User.deleteMany({ email: { $regex: '@test.com$' } });
        await SolveHistory.deleteMany({ userId: { $regex: /^test-/ } });
        await UserProfile.deleteMany({ userId: { $regex: /^test-/ } });

        // Get all questions to work with
        const allQuestions = await Question.find().sort({ order: 1 });
        console.log(`📚 Found ${allQuestions.length} questions`);

        if (allQuestions.length === 0) {
            console.log('❌ No questions found in database. Please run syncQuestionsFromJson.js first.');
            process.exit(1);
        }

        // Group questions by topic and difficulty
        const questionsByGroup = {};
        const questionsByDifficulty = { Easy: [], Medium: [], Hard: [] };

        allQuestions.forEach(q => {
            if (!questionsByGroup[q.group]) {
                questionsByGroup[q.group] = [];
            }
            questionsByGroup[q.group].push(q);
            questionsByDifficulty[q.difficulty].push(q);
        });

        const groups = Object.keys(questionsByGroup);
        console.log(`🏷️ Found ${groups.length} question groups`);
        console.log(`📊 Difficulty distribution: Easy: ${questionsByDifficulty.Easy.length}, Medium: ${questionsByDifficulty.Medium.length}, Hard: ${questionsByDifficulty.Hard.length}`);
        console.log('');

        for (const userData of testUsers) {
            console.log(`👤 Creating user: ${userData.firstName} ${userData.lastName} (${userData.profile})`);

            const scenario = learningScenarios[userData.profile];
            console.log(`   📋 Scenario: ${scenario.description}`);

            // Create user
            const user = await User.create(userData);
            console.log(`   ✅ User created with ID: ${user._id}`);

            // Create user profile
            const userProfile = await UserProfile.create({
                userId: user._id,
                preferences: {
                    dailyGoal: Math.floor(Math.random() * 3) + 3, // 3-5 questions per day
                    preferredDifficulty: userData.profile === 'beginner' ? 'Easy' :
                        userData.profile === 'advanced' ? 'Hard' : 'Medium',
                    focusAreas: [],
                    timePreferences: {
                        preferredTimeOfDay: ['morning', 'afternoon', 'evening'][Math.floor(Math.random() * 3)]
                    }
                }
            });

            // Generate solve history based on learning progression
            const solveHistories = await generateProgressiveSolveHistory(
                user._id,
                questionsByGroup,
                questionsByDifficulty,
                scenario
            );

            // Insert solve histories
            if (solveHistories.length > 0) {
                await SolveHistory.insertMany(solveHistories);
                console.log(`   📊 Created ${solveHistories.length} solve history records`);

                // Log topic distribution
                const topicCounts = {};
                solveHistories.forEach(sh => {
                    const topic = sh.questionId.group;
                    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
                });
                const topTopics = Object.entries(topicCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3);
                console.log(`   🎯 Top topics: ${topTopics.map(([topic, count]) => `${topic}(${count})`).join(', ')}`);
            }
        }

        console.log('\n🎉 Enhanced Test Users Created Successfully!');
        console.log('===========================================');

        // Print detailed summary
        console.log('\n📋 DETAILED SUMMARY:');
        for (const userData of testUsers) {
            const user = await User.findOne({ email: userData.email });
            const solveCount = await SolveHistory.countDocuments({ userId: user._id });

            // Calculate average attempts
            const histories = await SolveHistory.find({ userId: user._id });
            const avgAttempts = histories.length > 0 ?
                histories.reduce((sum, h) => sum + h.solveCount, 0) / histories.length : 0;

            console.log(`${userData.firstName} ${userData.lastName} (${userData.profile}):`);
            console.log(`   📊 ${solveCount} questions solved, ${avgAttempts.toFixed(1)} avg attempts`);
            console.log(`   🎯 Expected: ${learningScenarios[userData.profile].description}`);
        }

        console.log('\n✅ All enhanced test users are ready!');
        console.log('🎯 These users will properly test:');
        console.log('   • Topic mastery progression (beginner → learning → practicing → proficient → mastered)');
        console.log('   • Focus Areas (weak topics with low solve count or high retry rate)');
        console.log('   • Learning Progress (topics with active improvement)');
        console.log('   • Topics Mastered (high coverage + high efficiency)');
        console.log('   • Learning streaks and daily activity patterns');
        console.log('   • Spaced repetition for struggling areas');

    } catch (error) {
        console.error('❌ Error creating test users:', error);
    } finally {
        mongoose.connection.close();
    }
};

// Generate realistic learning progression solve history
const generateProgressiveSolveHistory = async (userId, questionsByGroup, questionsByDifficulty, scenario) => {
    const solveHistories = [];
    const { topicProgression, streakPattern, difficultyDistribution } = scenario;

    // Generate base date for progression (30 days ago)
    const baseDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let currentDate = new Date(baseDate);

    // Create daily activity pattern based on streak pattern
    const activityDates = generateActivityPattern(baseDate, streakPattern);
    let activityIndex = 0;

    // Process each topic in the progression
    for (const [topicName, config] of Object.entries(topicProgression)) {
        const topicQuestions = questionsByGroup[topicName] || [];
        if (topicQuestions.length === 0) continue;

        const { questions: questionCount, efficiency } = config;
        const attemptRange = efficiencyToAttempts[efficiency];

        // Select questions from this topic based on difficulty distribution
        const selectedQuestions = selectQuestionsByDifficulty(
            topicQuestions,
            questionCount,
            difficultyDistribution
        );

        // Generate solve history for each question
        for (let i = 0; i < selectedQuestions.length; i++) {
            const question = selectedQuestions[i];
            const attempts = Math.floor(Math.random() * (attemptRange.max - attemptRange.min + 1)) + attemptRange.min;

            // Use activity dates for realistic progression
            const solveDate = activityDates[activityIndex % activityDates.length];
            activityIndex++;

            // Generate solve sessions (attempts)
            const solveHistory = [];
            let sessionDate = new Date(solveDate);

            for (let attempt = 1; attempt <= attempts; attempt++) {
                const isLastAttempt = attempt === attempts;
                const isSuccess = isLastAttempt || Math.random() > 0.3; // Higher success rate on final attempt

                solveHistory.push({
                    solvedAt: new Date(sessionDate),
                    timeSpent: Math.floor(Math.random() * 45) + 15, // 15-60 minutes
                    success: isSuccess,
                    sessionContext: {
                        timeOfDay: getTimeOfDay(sessionDate),
                        recommendationStrategy: getRecommendationStrategy(topicName, config, attempt)
                    }
                });

                // Space out attempts (same day or next day for retries)
                if (attempt < attempts) {
                    sessionDate = new Date(sessionDate.getTime() + (Math.random() > 0.7 ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000));
                }
            }

            solveHistories.push({
                userId,
                questionId: question,
                solveCount: attempts,
                firstSolvedAt: solveHistory[0].solvedAt,
                lastUpdatedAt: solveHistory[solveHistory.length - 1].solvedAt,
                averageTimeToSolve: solveHistory.reduce((sum, s) => sum + s.timeSpent, 0) / solveHistory.length,
                difficulty_rating: getDifficultyRating(question.difficulty, efficiency),
                tags: generateSmartTags(efficiency, attempts, topicName),
                solveHistory
            });
        }
    }

    return solveHistories;
};

// Generate realistic activity patterns
const generateActivityPattern = (baseDate, pattern) => {
    const dates = [];
    let currentDate = new Date(baseDate);
    const endDate = new Date();

    while (currentDate <= endDate) {
        const shouldHaveActivity = getActivityProbability(pattern, dates.length);

        if (Math.random() < shouldHaveActivity) {
            dates.push(new Date(currentDate));
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
};

const getActivityProbability = (pattern, dayIndex) => {
    switch (pattern) {
        case 'inconsistent': return 0.3; // 30% chance per day
        case 'consistent': return 0.7;   // 70% chance per day
        case 'long': return 0.8;         // 80% chance per day
        case 'sporadic': return dayIndex % 7 < 3 ? 0.9 : 0.1; // Bursts then gaps
        case 'broken': return 0.4;       // 40% chance per day
        case 'variable': return Math.sin(dayIndex / 7) > 0 ? 0.7 : 0.3; // Variable
        default: return 0.5;
    }
};

const selectQuestionsByDifficulty = (questions, count, distribution) => {
    const selected = [];
    const { Easy, Medium, Hard } = distribution;

    const easyCount = Math.floor(count * Easy / 100);
    const mediumCount = Math.floor(count * Medium / 100);
    const hardCount = count - easyCount - mediumCount;

    const easyQuestions = questions.filter(q => q.difficulty === 'Easy');
    const mediumQuestions = questions.filter(q => q.difficulty === 'Medium');
    const hardQuestions = questions.filter(q => q.difficulty === 'Hard');

    selected.push(...easyQuestions.slice(0, easyCount));
    selected.push(...mediumQuestions.slice(0, mediumCount));
    selected.push(...hardQuestions.slice(0, hardCount));

    // Fill remaining with available questions
    const remaining = count - selected.length;
    const availableQuestions = questions.filter(q => !selected.includes(q));
    selected.push(...availableQuestions.slice(0, remaining));

    return selected;
};

const getTimeOfDay = (date) => {
    const hour = date.getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
};

const getRecommendationStrategy = (topicName, config, attempt) => {
    if (attempt > 2) return 'spaced_repetition';
    if (config.efficiency === 'poor' || config.efficiency === 'terrible') return 'weak_area_reinforcement';
    if (config.coverage > 60) return 'progressive_difficulty';
    return 'topic_exploration';
};

const getDifficultyRating = (questionDifficulty, efficiency) => {
    const baseRating = questionDifficulty === 'Easy' ? 2 : questionDifficulty === 'Medium' ? 3 : 4;
    const efficiencyModifier = {
        perfect: -1, excellent: -0.5, good: 0, average: 0.5, poor: 1, terrible: 1.5
    };
    return Math.max(1, Math.min(5, baseRating + (efficiencyModifier[efficiency] || 0)));
};

const generateSmartTags = (efficiency, attempts, topicName) => {
    const tags = [];

    if (efficiency === 'perfect' || efficiency === 'excellent') tags.push('favorite');
    if (attempts === 1) tags.push('easy');
    if (attempts > 4) tags.push('review');
    if (attempts > 6) tags.push('tricky');
    if (['Trees', 'Graphs', 'Dynamic Programming'].some(topic => topicName.includes(topic))) {
        tags.push('important');
    }

    return tags;
};

// Run the script
createTestUsers();