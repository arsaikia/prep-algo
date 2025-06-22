#!/usr/bin/env node

/**
 * 🎯 Daily Recommendation Engine Validation Script
 * 
 * This script validates the recommendation engine functionality by testing:
 * - Strategy distribution and allocation
 * - User level classification
 * - Edge cases and error handling
 * - API response formats
 * - Performance and consistency
 * 
 * Usage: node validateRecommendationEngine.js [--verbose]
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
const VERBOSE = process.argv.includes('--verbose');

// Test users with different profiles
const TEST_USERS = {
    beginner: 'test-alice-beginner-001',
    advanced: 'test-carol-advanced-003',
    comprehensive: 'test-user-123',
    newUser: 'validation-new-user-999',
    authenticated: 'a321e6bd-386b-49b1-8f9e-d9f27d234ebe'
};

// Expected strategy weights
const EXPECTED_STRATEGIES = {
    'weak_area_reinforcement': 0.4,
    'progressive_difficulty': 0.3,
    'spaced_repetition': 0.2,
    'topic_exploration': 'remaining',
    'general_practice': 'fill'
};

// Test results storage
const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
};

/**
 * Utility functions
 */
const log = (message, type = 'info') => {
    const timestamp = new Date().toISOString();
    const prefix = {
        info: '📋',
        success: '✅',
        error: '❌',
        warning: '⚠️',
        debug: '🐛'
    }[type];

    console.log(`${prefix} [${timestamp}] ${message}`);

    if (type !== 'debug' || VERBOSE) {
        results.details.push({ timestamp, type, message });
    }
};

const assert = (condition, message, isWarning = false) => {
    if (condition) {
        results.passed++;
        log(`PASS: ${message}`, 'success');
    } else {
        if (isWarning) {
            results.warnings++;
            log(`WARNING: ${message}`, 'warning');
        } else {
            results.failed++;
            log(`FAIL: ${message}`, 'error');
        }
    }
    return condition;
};

/**
 * API Helper functions
 */
const fetchRecommendations = async (userId, count = 5) => {
    try {
        const startTime = performance.now();
        const response = await axios.get(
            `${API_BASE_URL}/solveHistory/${userId}/daily-recommendations?count=${count}`
        );
        const endTime = performance.now();

        return {
            success: true,
            data: response.data,
            responseTime: endTime - startTime
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            status: error.response?.status
        };
    }
};

const updateSolveHistory = async (userId, questionId, timeSpent = 10) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/solveHistory`, {
            userId,
            questionId,
            timeSpent,
            success: true
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Test Functions
 */

// Test 1: Basic API Functionality
const testBasicAPI = async () => {
    log('🧪 Testing Basic API Functionality...');

    // Test with existing user
    const result = await fetchRecommendations(TEST_USERS.beginner, 5);

    assert(result.success, 'API responds successfully');
    assert(result.data?.success === true, 'Response has success flag');
    assert(Array.isArray(result.data?.data?.recommendations), 'Recommendations is an array');
    assert(result.data?.data?.recommendations?.length <= 5, 'Respects count parameter');
    assert(result.responseTime < 2000, 'Response time under 2 seconds', true);

    if (VERBOSE && result.success) {
        log(`Response time: ${result.responseTime.toFixed(2)}ms`, 'debug');
        log(`Recommendations count: ${result.data.data.recommendations.length}`, 'debug');
    }
};

// Test 2: User Level Classification
const testUserLevelClassification = async () => {
    log('🧪 Testing User Level Classification...');

    const tests = [
        { userId: TEST_USERS.beginner, expectedLevel: 'beginner' },
        { userId: TEST_USERS.advanced, expectedLevel: 'advanced' },
        { userId: TEST_USERS.newUser, expectedStrategy: 'beginner' }
    ];

    for (const test of tests) {
        const result = await fetchRecommendations(test.userId, 3);

        if (result.success) {
            const analysis = result.data.data.analysis;
            const strategy = result.data.data.strategy;

            if (test.expectedLevel) {
                assert(
                    analysis?.userLevel === test.expectedLevel,
                    `User ${test.userId} classified as ${test.expectedLevel}`
                );

                if (VERBOSE) {
                    log(`${test.userId}: Level=${analysis?.userLevel}, Solved=${analysis?.totalSolved}`, 'debug');
                }
            }

            if (test.expectedStrategy) {
                assert(
                    strategy === test.expectedStrategy,
                    `New user gets ${test.expectedStrategy} strategy`
                );
            }
        }
    }
};

// Test 3: Strategy Distribution
const testStrategyDistribution = async () => {
    log('🧪 Testing Strategy Distribution...');

    const result = await fetchRecommendations(TEST_USERS.comprehensive, 10);

    if (result.success) {
        const recommendations = result.data.data.recommendations;
        const strategyCount = {};

        recommendations.forEach(rec => {
            strategyCount[rec.strategy] = (strategyCount[rec.strategy] || 0) + 1;
        });

        // Test weak area reinforcement (should be ~40%)
        const weakAreaCount = strategyCount['weak_area_reinforcement'] || 0;
        const weakAreaPercentage = weakAreaCount / recommendations.length;
        assert(
            weakAreaPercentage >= 0.3 && weakAreaPercentage <= 0.5,
            `Weak area reinforcement within expected range (${(weakAreaPercentage * 100).toFixed(1)}%)`
        );

        // Test that all strategies have valid values
        Object.keys(strategyCount).forEach(strategy => {
            assert(
                Object.keys(EXPECTED_STRATEGIES).includes(strategy),
                `Strategy '${strategy}' is recognized`
            );
        });

        if (VERBOSE) {
            log('Strategy distribution:', 'debug');
            Object.entries(strategyCount).forEach(([strategy, count]) => {
                const percentage = ((count / recommendations.length) * 100).toFixed(1);
                log(`  ${strategy}: ${count} (${percentage}%)`, 'debug');
            });
        }
    }
};

// Test 4: Priority System
const testPrioritySystem = async () => {
    log('🧪 Testing Priority System...');

    const result = await fetchRecommendations(TEST_USERS.comprehensive, 5);

    if (result.success) {
        const recommendations = result.data.data.recommendations;
        const priorities = recommendations.map(rec => rec.priority);

        // Check that high priority items come first
        let lastPriorityValue = 3; // high = 3, medium = 2, low = 1
        let correctOrder = true;

        priorities.forEach(priority => {
            const currentValue = priority === 'high' ? 3 : priority === 'medium' ? 2 : 1;
            if (currentValue > lastPriorityValue) {
                correctOrder = false;
            }
            lastPriorityValue = currentValue;
        });

        assert(correctOrder, 'Recommendations sorted by priority correctly');

        // Check priority distribution
        const priorityCount = {};
        priorities.forEach(p => priorityCount[p] = (priorityCount[p] || 0) + 1);

        assert(
            priorityCount.high > 0,
            'Contains high priority recommendations'
        );

        if (VERBOSE) {
            log('Priority distribution:', 'debug');
            Object.entries(priorityCount).forEach(([priority, count]) => {
                log(`  ${priority}: ${count}`, 'debug');
            });
        }
    }
};

// Test 5: Response Format Validation
const testResponseFormat = async () => {
    log('🧪 Testing Response Format...');

    const result = await fetchRecommendations(TEST_USERS.beginner, 3);

    if (result.success) {
        const data = result.data.data;

        // Test recommendation structure
        if (data.recommendations && data.recommendations.length > 0) {
            const rec = data.recommendations[0];

            assert(rec.question, 'Recommendation has question object');
            assert(rec.question._id, 'Question has ID');
            assert(rec.question.name, 'Question has name');
            assert(rec.question.group, 'Question has group');
            assert(rec.question.difficulty, 'Question has difficulty');
            assert(rec.reason, 'Recommendation has reason');
            assert(rec.priority, 'Recommendation has priority');
            assert(rec.strategy, 'Recommendation has strategy');
        }

        // Test analysis structure (if present)
        if (data.analysis) {
            assert(data.analysis.userLevel, 'Analysis has user level');
            assert(typeof data.analysis.totalSolved === 'number', 'Analysis has total solved count');
            assert(Array.isArray(data.analysis.weakAreas), 'Analysis has weak areas array');
        }
    }
};

// Test 6: Edge Cases
const testEdgeCases = async () => {
    log('🧪 Testing Edge Cases...');

    // Test with invalid user ID
    const invalidResult = await fetchRecommendations('invalid-user-123', 5);
    assert(
        invalidResult.success && invalidResult.data.data.strategy === 'beginner',
        'Handles invalid user ID gracefully'
    );

    // Test with different count values
    const countTests = [1, 3, 5, 10];
    for (const count of countTests) {
        const result = await fetchRecommendations(TEST_USERS.beginner, count);
        if (result.success) {
            assert(
                result.data.data.recommendations.length <= count,
                `Respects count parameter (${count})`
            );
        }
    }

    // Test response time consistency
    const times = [];
    for (let i = 0; i < 3; i++) {
        const result = await fetchRecommendations(TEST_USERS.advanced, 5);
        if (result.success) {
            times.push(result.responseTime);
        }
    }

    if (times.length === 3) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times);
        assert(
            maxTime < avgTime * 2,
            'Response time is consistent',
            true
        );

        if (VERBOSE) {
            log(`Average response time: ${avgTime.toFixed(2)}ms`, 'debug');
        }
    }
};

// Test 7: Solve History Integration
const testSolveHistoryIntegration = async () => {
    log('🧪 Testing Solve History Integration...');

    // Get initial recommendations
    const initialResult = await fetchRecommendations(TEST_USERS.authenticated, 3);

    if (initialResult.success && initialResult.data.data.recommendations.length > 0) {
        const questionId = initialResult.data.data.recommendations[0].question._id;

        // Update solve history
        const updateResult = await updateSolveHistory(TEST_USERS.authenticated, questionId, 15);
        assert(updateResult.success, 'Can update solve history');

        if (updateResult.success) {
            // Get updated recommendations
            const updatedResult = await fetchRecommendations(TEST_USERS.authenticated, 3);
            assert(updatedResult.success, 'Can fetch recommendations after history update');

            if (VERBOSE) {
                log('Solve history integration test completed', 'debug');
            }
        }
    }
};

/**
 * Main Test Runner
 */
const runValidation = async () => {
    log('🚀 Starting Recommendation Engine Validation...');
    log(`API Base URL: ${API_BASE_URL}`);
    log(`Verbose mode: ${VERBOSE ? 'ON' : 'OFF'}`);
    log('');

    const startTime = performance.now();

    try {
        await testBasicAPI();
        await testUserLevelClassification();
        await testStrategyDistribution();
        await testPrioritySystem();
        await testResponseFormat();
        await testEdgeCases();
        await testSolveHistoryIntegration();

    } catch (error) {
        log(`Unexpected error during validation: ${error.message}`, 'error');
        results.failed++;
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Summary Report
    log('');
    log('📊 VALIDATION SUMMARY REPORT');
    log('============================');
    log(`✅ Tests Passed: ${results.passed}`);
    log(`❌ Tests Failed: ${results.failed}`);
    log(`⚠️  Warnings: ${results.warnings}`);
    log(`⏱️  Total Time: ${totalTime.toFixed(2)}ms`);
    log('');

    if (results.failed === 0) {
        log('🎉 ALL TESTS PASSED! Recommendation engine is working correctly.', 'success');
    } else {
        log(`💥 ${results.failed} test(s) failed. Please review the issues above.`, 'error');
    }

    if (results.warnings > 0) {
        log(`⚠️  ${results.warnings} warning(s) detected. Consider investigating.`, 'warning');
    }

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
};

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
    process.exit(1);
});

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runValidation();
}

export default runValidation; 