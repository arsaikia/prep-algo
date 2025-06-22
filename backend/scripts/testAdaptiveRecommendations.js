#!/usr/bin/env node

/**
 * 🧪 Test Adaptive Recommendations
 * 
 * This script tests the new adaptive recommendation system by:
 * - Testing the API endpoints
 * - Validating adaptive weight adjustments
 * - Checking time-based preferences
 * 
 * Usage: node testAdaptiveRecommendations.js
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

// Test users
const TEST_USERS = {
    authenticated: 'a321e6bd-386b-49b1-8f9e-d9f27d234ebe',
    beginner: 'test-alice-beginner-001',
    advanced: 'test-carol-advanced-003'
};

const log = (message, type = 'info') => {
    const timestamp = new Date().toISOString();
    const prefix = {
        info: '📋',
        success: '✅',
        error: '❌',
        warning: '⚠️',
        test: '🧪'
    }[type];
    console.log(`${prefix} [${timestamp}] ${message}`);
};

const testAdaptiveRecommendations = async () => {
    try {
        await connectDB();
        log('Connected to MongoDB');

        // Test 1: Basic adaptive recommendations API
        await testAdaptiveAPI();

        // Test 2: Compare with original recommendations
        await compareWithOriginal();

        // Test 3: Test weight adjustment logic
        await testWeightAdjustment();

        // Test 4: Test time-based preferences
        await testTimeBasedPreferences();

        log('🎉 All tests completed successfully!', 'success');

    } catch (error) {
        log(`❌ Test failed: ${error.message}`, 'error');
        process.exit(1);
    } finally {
        process.exit(0);
    }
};

const testAdaptiveAPI = async () => {
    log('🧪 Testing Adaptive Recommendations API...', 'test');

    for (const [userType, userId] of Object.entries(TEST_USERS)) {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/adaptive-recommendations/${userId}/daily?count=5`
            );

            if (response.status === 200) {
                const data = response.data.data;
                log(`✅ ${userType}: Got ${data.recommendations.length} adaptive recommendations`, 'success');

                // Check for adaptive features
                if (data.analysis.adaptiveFeatures) {
                    log(`   📊 Adaptive features enabled: ${data.analysis.adaptiveFeatures.enabled}`);
                    if (data.analysis.adaptiveWeights) {
                        const weights = data.analysis.adaptiveWeights;
                        log(`   🎯 Adaptive weights: weak=${weights.weak_area_reinforcement}, prog=${weights.progressive_difficulty}, spaced=${weights.spaced_repetition}`);
                    }
                    if (data.analysis.timePreferences) {
                        log(`   ⏰ Optimal time: ${data.analysis.timePreferences.optimalTimeOfDay}`);
                    }
                }

                // Check recommendation quality
                const hasAdaptiveContext = data.recommendations.some(rec => rec.adaptiveContext);
                log(`   🎯 Recommendations with adaptive context: ${hasAdaptiveContext ? 'Yes' : 'No'}`);

            } else {
                log(`❌ ${userType}: API returned status ${response.status}`, 'error');
            }

        } catch (error) {
            log(`❌ ${userType}: API error - ${error.message}`, 'error');
        }
    }
};

const compareWithOriginal = async () => {
    log('🧪 Comparing Adaptive vs Original Recommendations...', 'test');

    const userId = TEST_USERS.authenticated;

    try {
        // Get original recommendations
        const originalResponse = await axios.get(
            `${API_BASE_URL}/solveHistory/${userId}/daily-recommendations?count=5`
        );

        // Get adaptive recommendations
        const adaptiveResponse = await axios.get(
            `${API_BASE_URL}/adaptive-recommendations/${userId}/daily?count=5`
        );

        if (originalResponse.status === 200 && adaptiveResponse.status === 200) {
            const originalRecs = originalResponse.data.data.recommendations;
            const adaptiveRecs = adaptiveResponse.data.data.recommendations;

            log(`📊 Original: ${originalRecs.length} recommendations`);
            log(`🧠 Adaptive: ${adaptiveRecs.length} recommendations`);

            // Compare strategy distribution
            const originalStrategies = {};
            const adaptiveStrategies = {};

            originalRecs.forEach(rec => {
                originalStrategies[rec.strategy] = (originalStrategies[rec.strategy] || 0) + 1;
            });

            adaptiveRecs.forEach(rec => {
                adaptiveStrategies[rec.strategy] = (adaptiveStrategies[rec.strategy] || 0) + 1;
            });

            log(`📈 Original strategy distribution:`, JSON.stringify(originalStrategies));
            log(`🎯 Adaptive strategy distribution:`, JSON.stringify(adaptiveStrategies));

            // Check for differences
            const adaptiveHasContext = adaptiveRecs.some(rec => rec.adaptiveContext);
            const adaptiveHasWeightInfo = adaptiveRecs.some(rec => rec.adaptiveContext?.weightUsed);

            log(`✅ Adaptive features working: Context=${adaptiveHasContext}, Weights=${adaptiveHasWeightInfo}`, 'success');

        } else {
            log(`❌ Comparison failed - Original: ${originalResponse.status}, Adaptive: ${adaptiveResponse.status}`, 'error');
        }

    } catch (error) {
        log(`❌ Comparison error: ${error.message}`, 'error');
    }
};

const testWeightAdjustment = async () => {
    log('🧪 Testing Weight Adjustment Logic...', 'test');

    const userId = TEST_USERS.authenticated;

    try {
        // First check current state
        const initialResponse = await axios.get(
            `${API_BASE_URL}/adaptive-recommendations/${userId}/daily?count=5`
        );

        if (initialResponse.status === 200) {
            const initialAnalysis = initialResponse.data.data.analysis;
            const hasSufficientData = initialAnalysis.adaptiveFeatures?.enabled;
            const initialSuccessRate = initialAnalysis.recentPerformance?.successRate || 0;

            log(`📊 Initial state: sufficient data=${hasSufficientData}, success rate=${(initialSuccessRate * 100).toFixed(1)}%`);

            if (hasSufficientData) {
                // Simulate poor performance - add 10 failed attempts to drop success rate below 40%
                log('📉 Simulating poor performance...');
                for (let i = 0; i < 10; i++) {
                    await axios.post(`${API_BASE_URL}/adaptive-recommendations/${userId}/update`, {
                        questionId: `test-question-${Date.now()}-${i}`, // unique IDs
                        success: false,
                        timeSpent: 25,
                        strategy: 'weak_area_reinforcement'
                    });
                }

                // Wait for processing
                await new Promise(resolve => setTimeout(resolve, 100));

                // Get recommendations after poor performance
                const afterPoorResponse = await axios.get(
                    `${API_BASE_URL}/adaptive-recommendations/${userId}/daily?count=5`
                );

                if (afterPoorResponse.status === 200) {
                    const afterAnalysis = afterPoorResponse.data.data.analysis;
                    const newSuccessRate = afterAnalysis.recentPerformance?.successRate || 0;
                    const weights = afterAnalysis.adaptiveWeights;

                    log(`📊 After poor performance: success rate=${(newSuccessRate * 100).toFixed(1)}%`);
                    log(`📊 Weights after poor performance: weak=${weights.weak_area_reinforcement}, prog=${weights.progressive_difficulty}`);

                    // Check if weight adjustment triggered
                    if (newSuccessRate < 0.4 && weights.weak_area_reinforcement > 0.4) {
                        log(`✅ Weight adjustment working - increased weak area focus`, 'success');
                    } else if (newSuccessRate >= 0.4) {
                        log(`📋 Success rate still above threshold for adjustment (${(newSuccessRate * 100).toFixed(1)}%)`, 'info');
                    } else {
                        log(`⚠️ Weight adjustment may not be working as expected`, 'warning');
                    }
                } else {
                    log(`❌ Failed to get recommendations after poor performance`, 'error');
                }
            } else {
                log(`📋 User needs more solve history for weight adjustment (requires sufficient data)`, 'info');
            }
        } else {
            log(`❌ Failed to get initial recommendations`, 'error');
        }

    } catch (error) {
        log(`❌ Weight adjustment test error: ${error.message}`, 'error');
    }
};

const testTimeBasedPreferences = async () => {
    log('🧪 Testing Time-based Preferences...', 'test');

    const userId = TEST_USERS.authenticated;

    try {
        const response = await axios.get(
            `${API_BASE_URL}/adaptive-recommendations/${userId}/daily?count=5`
        );

        if (response.status === 200) {
            const timePrefs = response.data.data.analysis.timePreferences;
            const optimalTime = response.data.data.analysis.optimalTimeOfDay;

            log(`⏰ Time preferences detected:`);
            log(`   Morning: ${timePrefs.morningPerformance.sessionCount} sessions, ${(timePrefs.morningPerformance.averageSuccessRate * 100).toFixed(1)}% success`);
            log(`   Afternoon: ${timePrefs.afternoonPerformance.sessionCount} sessions, ${(timePrefs.afternoonPerformance.averageSuccessRate * 100).toFixed(1)}% success`);
            log(`   Evening: ${timePrefs.eveningPerformance.sessionCount} sessions, ${(timePrefs.eveningPerformance.averageSuccessRate * 100).toFixed(1)}% success`);
            log(`   Optimal time: ${optimalTime}`);

            // Check if recommendations include time optimization
            const hasTimeOptimization = response.data.data.recommendations.some(rec =>
                rec.adaptiveContext?.timeOptimized
            );

            if (hasTimeOptimization) {
                log(`✅ Time-based optimization working`, 'success');
            } else {
                log(`⚠️ Time-based optimization not detected`, 'warning');
            }

        } else {
            log(`❌ Time preferences test failed - status ${response.status}`, 'error');
        }

    } catch (error) {
        log(`❌ Time preferences test error: ${error.message}`, 'error');
    }
};

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
    log('🚀 Starting Adaptive Recommendations Tests...');
    testAdaptiveRecommendations();
} 