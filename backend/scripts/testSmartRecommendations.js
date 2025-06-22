import { connectDB } from '../config/db.js';
import DailyRecommendationBatch from '../models/DailyRecommendationBatch.js';
import SolveHistory from '../models/SolveHistory.js';
import UserProfile from '../models/UserProfile.js';
import Question from '../models/Question.js';

const testSmartRecommendations = async () => {
    try {
        console.log('🧠 Testing Smart Hybrid Recommendations System');
        console.log('================================================');

        // Connect to database
        await connectDB();

        // Test user ID (use your actual user ID)
        const testUserId = 'a321e6bd-386b-49b1-8f9e-d9f27d234ebe';

        console.log(`\n📋 Testing for user: ${testUserId}`);

        // 1. Check existing user profile
        console.log('\n1️⃣ Checking User Profile...');
        let userProfile = await UserProfile.findByUserId(testUserId);
        if (!userProfile) {
            console.log('   ❌ No user profile found - creating from solve history');
            const existingHistory = await SolveHistory.find({ userId: testUserId }).populate('questionId');
            userProfile = await UserProfile.createFromSolveHistory(testUserId, existingHistory);
            await userProfile.save();
            console.log('   ✅ User profile created');
        } else {
            console.log('   ✅ User profile exists');
        }

        console.log('   📊 Adaptive Weights:', userProfile.getAdaptiveWeights());

        // 2. Check solve history
        console.log('\n2️⃣ Checking Solve History...');
        const solveHistory = await SolveHistory.find({ userId: testUserId }).populate('questionId');
        console.log(`   📈 Total questions solved: ${solveHistory.length}`);

        if (solveHistory.length > 0) {
            const recentHistory = solveHistory.slice(-3);
            console.log('   🔍 Recent questions:');
            recentHistory.forEach(history => {
                console.log(`     - ${history.questionId?.name || 'Unknown'} (${history.solveCount} times)`);
            });
        }

        // 3. Test daily batch creation
        console.log('\n3️⃣ Testing Daily Batch Creation...');

        // Clean up existing batch for today
        const today = new Date().toISOString().split('T')[0];
        await DailyRecommendationBatch.deleteOne({ userId: testUserId, date: today });
        console.log('   🧹 Cleaned up existing batch');

        // Test the smart recommendations endpoint manually
        console.log('\n4️⃣ Testing Smart Recommendations Logic...');

        // Import the controller function (simulate the API call)
        const { getSmartDailyRecommendations } = await import('../controller/smartRecommendations.js');

        // Create a mock request/response
        const mockReq = {
            params: { userId: testUserId },
            query: { count: 5, forceRefresh: false }
        };

        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    console.log(`   📡 Response Status: ${code}`);
                    console.log('   📦 Response Data:');
                    console.log(JSON.stringify(data, null, 2));
                    return data;
                }
            })
        };

        const mockNext = (error) => {
            console.log('   ❌ Error:', error.message);
        };

        // Test the function
        try {
            await getSmartDailyRecommendations(mockReq, mockRes, mockNext);
        } catch (error) {
            console.log('   ❌ Direct function test failed:', error.message);
        }

        // 5. Test batch refresh logic
        console.log('\n5️⃣ Testing Batch Refresh Logic...');
        const batch = await DailyRecommendationBatch.findTodaysBatch(testUserId);

        if (batch) {
            console.log('   ✅ Batch found');
            console.log(`   📊 Recommendations: ${batch.recommendations.length}`);
            console.log(`   🔄 Refresh Count: ${batch.refreshCount}`);

            const refreshCheck = batch.shouldRefresh(testUserId);
            console.log('   🔍 Refresh Check:', refreshCheck);

            // Test marking a question as completed
            if (batch.recommendations.length > 0) {
                const firstQuestion = batch.recommendations[0];
                console.log('\n   📝 Testing question completion...');
                await batch.markQuestionCompleted(firstQuestion.question._id || firstQuestion.question.id, {
                    timeSpent: 300, // 5 minutes
                    success: true
                });
                console.log('   ✅ Question marked as completed');

                const progress = batch.getProgress();
                console.log('   📈 Progress:', progress);
            }
        } else {
            console.log('   ❌ No batch found');
        }

        // 6. Test cleanup
        console.log('\n6️⃣ Testing Cleanup...');
        const cleanupResult = await DailyRecommendationBatch.cleanupExpiredBatches();
        console.log(`   🧹 Cleaned up ${cleanupResult.deletedCount} expired batches`);

        console.log('\n✅ Smart Recommendations Test Complete!');
        console.log('================================================');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        process.exit(0);
    }
};

// Run the test
testSmartRecommendations(); 