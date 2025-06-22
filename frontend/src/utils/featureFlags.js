/**
 * Feature Flags System - Dev Mode Control
 * 
 * This system controls development features through a browser cookie (devMode=1).
 * 
 * How to Enable Dev Mode:
 * Set cookie manually: document.cookie = 'devMode=1; path=/'
 * To disable: document.cookie = 'devMode=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
 * 
 * Dev Mode Features:
 * - Test User Selector: Switch between different test users with pre-populated solve history
 * - Debug Logging: Console logs for debugging feature flags and app state
 * - Debug UI Elements: Show user IDs, tracking info, etc.
 * 
 * Note: All features are disabled by default and only enabled when the cookie is set.
 */

// Helper function to check for Dev Mode cookie
const isDevModeEnabled = () => {
    if (typeof document === 'undefined') return false;

    const cookies = document.cookie.split(';');
    const devModeCookie = cookies.find(cookie =>
        cookie.trim().startsWith('devMode=')
    );

    return devModeCookie ? devModeCookie.split('=')[1] === '1' : false;
};

// Feature flags controlled purely by Dev Mode cookie
export const FEATURE_FLAGS = {
    // Show test user selector only when Dev Mode is enabled
    SHOW_TEST_USER_SELECTOR: isDevModeEnabled(),

    // Enable debug logging only when Dev Mode is enabled
    DEBUG_LOGGING: isDevModeEnabled(),

    // Show performance metrics only when Dev Mode is enabled
    SHOW_PERFORMANCE_METRICS: isDevModeEnabled(),

    // Enable experimental features only when Dev Mode is enabled
    EXPERIMENTAL_FEATURES: isDevModeEnabled(),

    // Enable dev mode features (test users, debug info, etc.)
    DEV_MODE: isDevModeEnabled()
};

// Helper function to check if a feature is enabled
export const isFeatureEnabled = (featureName) => {
    return FEATURE_FLAGS[featureName] || false;
};

// Helper function to check if dev mode is enabled
export const isDevMode = () => {
    return isFeatureEnabled('DEV_MODE');
}; 