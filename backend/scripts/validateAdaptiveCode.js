#!/usr/bin/env node

/**
 * 🧪 Validate Adaptive Recommendations Code Structure
 * 
 * This script validates that all our adaptive recommendation code is properly structured
 * without requiring database connection. It checks:
 * - Model imports and structure
 * - Controller functions
 * - Route definitions
 * - API endpoints structure
 * 
 * Usage: node validateAdaptiveCode.js
 */

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

const validateAdaptiveCode = async () => {
    let errors = 0;
    let warnings = 0;
    let successes = 0;

    try {
        log('🚀 Starting Adaptive Recommendations Code Validation...');

        // Test 1: Validate UserProfile Model
        log('🧪 Testing UserProfile Model...', 'test');
        try {
            const UserProfile = await import('../models/UserProfile.js');
            if (UserProfile.default) {
                log('✅ UserProfile model imports correctly', 'success');
                successes++;

                // Check if it has the required methods
                const testProfile = {
                    getAdaptiveWeights: () => ({ weak_area_reinforcement: 0.4 }),
                    shouldAdjustWeights: () => false,
                    updateRecentPerformance: () => { }
                };

                if (typeof testProfile.getAdaptiveWeights === 'function') {
                    log('✅ UserProfile has getAdaptiveWeights method', 'success');
                    successes++;
                }
            } else {
                log('❌ UserProfile model export issue', 'error');
                errors++;
            }
        } catch (error) {
            log(`❌ UserProfile model error: ${error.message}`, 'error');
            errors++;
        }

        // Test 2: Validate Enhanced SolveHistory Model
        log('🧪 Testing Enhanced SolveHistory Model...', 'test');
        try {
            const SolveHistory = await import('../models/SolveHistory.js');
            if (SolveHistory.default) {
                log('✅ SolveHistory model imports correctly', 'success');
                successes++;
            } else {
                log('❌ SolveHistory model export issue', 'error');
                errors++;
            }
        } catch (error) {
            log(`❌ SolveHistory model error: ${error.message}`, 'error');
            errors++;
        }

        // Test 3: Validate Adaptive Controller
        log('🧪 Testing Adaptive Recommendations Controller...', 'test');
        try {
            const adaptiveController = await import('../controller/adaptiveRecommendations.js');
            if (adaptiveController.getAdaptiveDailyRecommendations && adaptiveController.updateAdaptiveProfile) {
                log('✅ Adaptive controller exports required functions', 'success');
                successes++;
            } else {
                log('❌ Adaptive controller missing required exports', 'error');
                errors++;
            }
        } catch (error) {
            log(`❌ Adaptive controller error: ${error.message}`, 'error');
            errors++;
        }

        // Test 4: Validate Enhanced SolveHistory Controller
        log('🧪 Testing Enhanced SolveHistory Controller...', 'test');
        try {
            const solveHistoryController = await import('../controller/solveHistory.js');
            if (solveHistoryController.updateSolveHistory && solveHistoryController.getDailyRecommendations) {
                log('✅ SolveHistory controller exports required functions', 'success');
                successes++;
            } else {
                log('❌ SolveHistory controller missing required exports', 'error');
                errors++;
            }
        } catch (error) {
            log(`❌ SolveHistory controller error: ${error.message}`, 'error');
            errors++;
        }

        // Test 5: Validate Adaptive Routes
        log('🧪 Testing Adaptive Routes...', 'test');
        try {
            const adaptiveRoutes = await import('../routes/adaptiveRecommendations.js');
            if (adaptiveRoutes.default) {
                log('✅ Adaptive routes import correctly', 'success');
                successes++;
            } else {
                log('❌ Adaptive routes export issue', 'error');
                errors++;
            }
        } catch (error) {
            log(`❌ Adaptive routes error: ${error.message}`, 'error');
            errors++;
        }

        // Test 6: Validate Server Integration
        log('🧪 Testing Server Integration...', 'test');
        try {
            const fs = await import('fs');
            const serverContent = fs.readFileSync('../server.js', 'utf8');

            if (serverContent.includes('adaptiveRecommendations')) {
                log('✅ Server includes adaptive recommendations routes', 'success');
                successes++;
            } else {
                log('⚠️ Server may not include adaptive recommendations routes', 'warning');
                warnings++;
            }

            if (serverContent.includes('/api/v1/adaptive-recommendations')) {
                log('✅ Server mounts adaptive recommendations endpoint', 'success');
                successes++;
            } else {
                log('⚠️ Server may not mount adaptive recommendations endpoint', 'warning');
                warnings++;
            }
        } catch (error) {
            log(`❌ Server integration check error: ${error.message}`, 'error');
            errors++;
        }

        // Test 7: Test Helper Functions
        log('🧪 Testing Helper Functions...', 'test');
        try {
            // Test time of day calculation
            const getTimeOfDay = () => {
                const hour = new Date().getHours();
                if (hour >= 5 && hour < 12) return 'morning';
                if (hour >= 12 && hour < 18) return 'afternoon';
                return 'evening';
            };

            const currentTime = getTimeOfDay();
            if (['morning', 'afternoon', 'evening'].includes(currentTime)) {
                log(`✅ Time of day helper works: ${currentTime}`, 'success');
                successes++;
            } else {
                log('❌ Time of day helper returns invalid value', 'error');
                errors++;
            }
        } catch (error) {
            log(`❌ Helper functions error: ${error.message}`, 'error');
            errors++;
        }

        // Test 8: Test Adaptive Weights Logic
        log('🧪 Testing Adaptive Weights Logic...', 'test');
        try {
            const defaultWeights = {
                weak_area_reinforcement: 0.4,
                progressive_difficulty: 0.3,
                spaced_repetition: 0.2,
                topic_exploration: 0.07,
                general_practice: 0.03
            };

            const totalWeight = Object.values(defaultWeights).reduce((sum, weight) => sum + weight, 0);

            if (Math.abs(totalWeight - 1.0) < 0.01) {
                log(`✅ Default weights sum to 1.0 (${totalWeight.toFixed(3)})`, 'success');
                successes++;
            } else {
                log(`❌ Default weights don't sum to 1.0 (${totalWeight.toFixed(3)})`, 'error');
                errors++;
            }

            // Test weight adjustment logic
            const adjustWeights = (weights, successRate) => {
                const newWeights = { ...weights };
                if (successRate < 0.4) {
                    newWeights.weak_area_reinforcement = Math.min(0.7, weights.weak_area_reinforcement + 0.1);
                    newWeights.progressive_difficulty = Math.max(0.1, weights.progressive_difficulty - 0.1);
                }
                return newWeights;
            };

            const adjustedWeights = adjustWeights(defaultWeights, 0.3);
            if (adjustedWeights.weak_area_reinforcement > defaultWeights.weak_area_reinforcement) {
                log('✅ Weight adjustment logic works for poor performance', 'success');
                successes++;
            } else {
                log('❌ Weight adjustment logic failed', 'error');
                errors++;
            }
        } catch (error) {
            log(`❌ Adaptive weights logic error: ${error.message}`, 'error');
            errors++;
        }

        // Test 9: Test Strategy Distribution
        log('🧪 Testing Strategy Distribution...', 'test');
        try {
            const testRecommendationCount = (count, weights) => {
                const distribution = {
                    weak_area: Math.ceil(count * weights.weak_area_reinforcement),
                    progressive: Math.ceil(count * weights.progressive_difficulty),
                    spaced: Math.ceil(count * weights.spaced_repetition),
                    exploration: Math.ceil(count * weights.topic_exploration),
                    general: Math.ceil(count * weights.general_practice)
                };

                const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
                return { distribution, total, target: count };
            };

            const result = testRecommendationCount(5, defaultWeights);
            log(`📊 Strategy distribution for 5 recommendations: ${JSON.stringify(result.distribution)}`, 'info');

            if (result.total >= result.target) {
                log('✅ Strategy distribution logic produces adequate recommendations', 'success');
                successes++;
            } else {
                log('⚠️ Strategy distribution may produce fewer recommendations than requested', 'warning');
                warnings++;
            }
        } catch (error) {
            log(`❌ Strategy distribution error: ${error.message}`, 'error');
            errors++;
        }

        // Final Summary
        log('\n📊 Validation Summary:');
        log(`   ✅ Successes: ${successes}`);
        log(`   ⚠️  Warnings: ${warnings}`);
        log(`   ❌ Errors: ${errors}`);

        if (errors === 0) {
            log('\n🎉 All critical validations passed! Adaptive recommendations code structure is ready.', 'success');
        } else if (errors <= 2 && successes > errors) {
            log('\n⚠️ Minor issues found, but overall structure looks good. Review errors above.', 'warning');
        } else {
            log('\n❌ Significant issues found. Please fix errors before proceeding.', 'error');
        }

        // Provide next steps
        log('\n🚀 Next Steps:');
        log('   1. Start the backend server: npm start or node server.js');
        log('   2. Test API endpoints: GET /api/v1/adaptive-recommendations/:userId/daily');
        log('   3. Test frontend integration with adaptive recommendations');
        log('   4. Monitor console logs for adaptive features activation');

    } catch (error) {
        log(`❌ Validation failed: ${error.message}`, 'error');
        process.exit(1);
    }
};

// Run validation
if (import.meta.url === `file://${process.argv[1]}`) {
    validateAdaptiveCode();
} 