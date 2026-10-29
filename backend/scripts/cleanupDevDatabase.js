import './retiredMongoScript.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import SolveHistory from '../models/SolveHistory.js';
import UserProfile from '../models/UserProfile.js';
import DailyRecommendationBatch from '../models/DailyRecommendationBatch.js';
import Question from '../models/Question.js';
import { connectDB } from '../config/db.js';

dotenv.config();

// Safety check - only run in development
if (process.env.NODE_ENV !== 'development') {
    console.log('❌ This script can only run in development environment');
    console.log('   Current NODE_ENV:', process.env.NODE_ENV);
    process.exit(1);
}

const cleanupDevDatabase = async () => {
    try {
        console.log('🧹 CLEANUP DEV DATABASE');
        console.log('=======================');
        console.log(`Environment: ${process.env.NODE_ENV}`);
        console.log('⚠️  This will delete all data except questions!');
        console.log('');

        // Connect to database
        await connectDB();

        // Get counts before cleanup
        const beforeCounts = {
            users: await User.countDocuments(),
            solveHistory: await SolveHistory.countDocuments(),
            userProfiles: await UserProfile.countDocuments(),
            dailyBatches: await DailyRecommendationBatch.countDocuments(),
            questions: await Question.countDocuments()
        };

        console.log('📊 Before cleanup:');
        console.log(`   Users: ${beforeCounts.users}`);
        console.log(`   Solve History: ${beforeCounts.solveHistory}`);
        console.log(`   User Profiles: ${beforeCounts.userProfiles}`);
        console.log(`   Daily Batches: ${beforeCounts.dailyBatches}`);
        console.log(`   Questions: ${beforeCounts.questions} (will be preserved)`);
        console.log('');

        // Cleanup collections (preserve questions)
        console.log('🗑️  Cleaning up collections...');

        const userDeleteResult = await User.deleteMany({});
        console.log(`   ✅ Removed ${userDeleteResult.deletedCount} users`);

        const solveHistoryDeleteResult = await SolveHistory.deleteMany({});
        console.log(`   ✅ Removed ${solveHistoryDeleteResult.deletedCount} solve history records`);

        const userProfileDeleteResult = await UserProfile.deleteMany({});
        console.log(`   ✅ Removed ${userProfileDeleteResult.deletedCount} user profiles`);

        const batchDeleteResult = await DailyRecommendationBatch.deleteMany({});
        console.log(`   ✅ Removed ${batchDeleteResult.deletedCount} daily recommendation batches`);

        console.log('');

        // Verify cleanup
        const afterCounts = {
            users: await User.countDocuments(),
            solveHistory: await SolveHistory.countDocuments(),
            userProfiles: await UserProfile.countDocuments(),
            dailyBatches: await DailyRecommendationBatch.countDocuments(),
            questions: await Question.countDocuments()
        };

        console.log('✅ After cleanup:');
        console.log(`   Users: ${afterCounts.users}`);
        console.log(`   Solve History: ${afterCounts.solveHistory}`);
        console.log(`   User Profiles: ${afterCounts.userProfiles}`);
        console.log(`   Daily Batches: ${afterCounts.dailyBatches}`);
        console.log(`   Questions: ${afterCounts.questions} (preserved)`);
        console.log('');

        // Verify cleanup was successful
        const totalDeleted = (beforeCounts.users - afterCounts.users) +
            (beforeCounts.solveHistory - afterCounts.solveHistory) +
            (beforeCounts.userProfiles - afterCounts.userProfiles) +
            (beforeCounts.dailyBatches - afterCounts.dailyBatches);

        if (afterCounts.users === 0 &&
            afterCounts.solveHistory === 0 &&
            afterCounts.userProfiles === 0 &&
            afterCounts.dailyBatches === 0 &&
            afterCounts.questions === beforeCounts.questions) {

            console.log('🎉 CLEANUP COMPLETED SUCCESSFULLY!');
            console.log('==================================');
            console.log(`✅ Removed ${totalDeleted} total records`);
            console.log('✅ Questions preserved for testing');
            console.log('✅ Database is clean and ready');
            console.log('');
            console.log('📝 Next steps:');
            console.log('   1. Run: node scripts/createTestUsers.js');
            console.log('   2. Test the new hybrid recommendation system!');
        } else {
            console.log('⚠️  Cleanup verification failed - some data may remain');
        }

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
};

// Run the script
if (process.env.NODE_ENV === 'development') {
    cleanupDevDatabase();
} else {
    console.log('❌ This script can only run in development environment');
    process.exit(1);
} 