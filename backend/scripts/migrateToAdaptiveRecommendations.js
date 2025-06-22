#!/usr/bin/env node

/**
 * 🚀 Adaptive Recommendations Migration Script
 * 
 * This script migrates existing users to the new adaptive recommendation system by:
 * - Creating UserProfile documents for all existing users
 * - Analyzing their solve history to populate initial metrics
 * - Setting up adaptive weights based on their performance patterns
 * 
 * Usage: node migrateToAdaptiveRecommendations.js [--dry-run]
 */

import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import SolveHistory from '../models/SolveHistory.js';
import UserProfile from '../models/UserProfile.js';

const DRY_RUN = process.argv.includes('--dry-run');

const log = (message, type = 'info') => {
    const timestamp = new Date().toISOString();
    const prefix = {
        info: '📋',
        success: '✅',
        error: '❌',
        warning: '⚠️'
    }[type];
    console.log(`${prefix} [${timestamp}] ${message}`);
};

const migrateToAdaptiveRecommendations = async () => {
    try {
        await connectDB();
        log('Connected to MongoDB');

        // Get all users
        const users = await User.find({});
        log(`Found ${users.length} users to migrate`);

        let migrated = 0;
        let skipped = 0;
        let errors = 0;

        for (const user of users) {
            try {
                // Check if user already has a profile
                const existingProfile = await UserProfile.findByUserId(user._id);
                if (existingProfile) {
                    log(`User ${user.firstName} (${user._id}) already has adaptive profile - skipping`, 'warning');
                    skipped++;
                    continue;
                }

                // Get user's solve history
                const solveHistory = await SolveHistory.find({ userId: user._id }).populate('questionId');

                if (DRY_RUN) {
                    log(`[DRY RUN] Would create profile for ${user.firstName} (${user._id}) with ${solveHistory.length} solve records`);
                    migrated++;
                    continue;
                }

                // Create user profile from solve history
                const userProfile = await UserProfile.createFromSolveHistory(user._id, solveHistory);

                // Enhance profile with initial analysis if they have enough data
                if (solveHistory.length >= 5) {
                    await enhanceProfileWithAnalysis(userProfile, solveHistory);
                }

                await userProfile.save();

                log(`✅ Created adaptive profile for ${user.firstName} (${user._id}) - ${solveHistory.length} questions analyzed`, 'success');
                migrated++;

            } catch (userError) {
                log(`❌ Error migrating user ${user.firstName} (${user._id}): ${userError.message}`, 'error');
                errors++;
            }
        }

        log(`\n📊 Migration Summary:`);
        log(`   ✅ Migrated: ${migrated} users`);
        log(`   ⚠️  Skipped: ${skipped} users (already had profiles)`);
        log(`   ❌ Errors: ${errors} users`);

        if (DRY_RUN) {
            log(`\n🔍 This was a dry run. Run without --dry-run to actually migrate users.`);
        } else {
            log(`\n🎉 Migration completed successfully!`);
        }

    } catch (error) {
        log(`❌ Migration failed: ${error.message}`, 'error');
        process.exit(1);
    } finally {
        process.exit(0);
    }
};

// Enhance user profile with detailed analysis
const enhanceProfileWithAnalysis = async (userProfile, solveHistory) => {
    try {
        // Analyze time-based patterns
        const timeBasedStats = {
            morning: { attempts: 0, successes: 0, totalTime: 0 },
            afternoon: { attempts: 0, successes: 0, totalTime: 0 },
            evening: { attempts: 0, successes: 0, totalTime: 0 }
        };

        // Analyze all solve sessions
        solveHistory.forEach(history => {
            history.solveHistory?.forEach(session => {
                const timeOfDay = session.sessionContext?.timeOfDay || 'evening';
                const success = session.success;
                const timeSpent = session.timeSpent || 15;

                if (timeBasedStats[timeOfDay]) {
                    timeBasedStats[timeOfDay].attempts++;
                    if (success) timeBasedStats[timeOfDay].successes++;
                    timeBasedStats[timeOfDay].totalTime += timeSpent;
                }
            });
        });

        // Update time preferences
        Object.keys(timeBasedStats).forEach(timeOfDay => {
            const stats = timeBasedStats[timeOfDay];
            if (stats.attempts > 0) {
                userProfile.timePreferences[`${timeOfDay}Performance`] = {
                    averageSuccessRate: stats.successes / stats.attempts,
                    averageTimePerQuestion: stats.totalTime / stats.attempts,
                    sessionCount: stats.attempts
                };
            }
        });

        // Determine optimal time of day
        const bestTime = Object.entries(timeBasedStats)
            .filter(([time, stats]) => stats.attempts >= 2)
            .sort((a, b) => (b[1].successes / b[1].attempts) - (a[1].successes / a[1].attempts))[0];

        if (bestTime) {
            userProfile.timePreferences.optimalTimeOfDay = bestTime[0];
            userProfile.computedMetrics.strongestTimeOfDay = bestTime[0];
        }

        // Adjust adaptive weights based on performance patterns
        const overallSuccessRate = userProfile.recentPerformance.recentSuccessRate;

        if (overallSuccessRate < 0.5) {
            // Struggling user - focus more on weak areas and spaced repetition
            userProfile.adaptiveWeights.weak_area_reinforcement = 0.5;
            userProfile.adaptiveWeights.progressive_difficulty = 0.2;
            userProfile.adaptiveWeights.spaced_repetition = 0.25;
            userProfile.adaptiveWeights.topic_exploration = 0.03;
            userProfile.adaptiveWeights.general_practice = 0.02;
        } else if (overallSuccessRate > 0.8) {
            // High performer - more challenge and exploration
            userProfile.adaptiveWeights.weak_area_reinforcement = 0.3;
            userProfile.adaptiveWeights.progressive_difficulty = 0.4;
            userProfile.adaptiveWeights.spaced_repetition = 0.15;
            userProfile.adaptiveWeights.topic_exploration = 0.1;
            userProfile.adaptiveWeights.general_practice = 0.05;
        }
        // else keep default weights for average performers

        log(`   📈 Enhanced profile with time preferences (best: ${userProfile.timePreferences.optimalTimeOfDay}) and adaptive weights`);

    } catch (error) {
        log(`   ⚠️ Could not enhance profile analysis: ${error.message}`, 'warning');
    }
};

// Run migration
if (import.meta.url === `file://${process.argv[1]}`) {
    log('🚀 Starting Adaptive Recommendations Migration...');
    if (DRY_RUN) {
        log('🔍 Running in DRY RUN mode - no changes will be made');
    }
    migrateToAdaptiveRecommendations();
} 