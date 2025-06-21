// Helper function to check for God Mode cookie
const isGodModeEnabled = () => {
    if (typeof document === 'undefined') return false;

    const cookies = document.cookie.split(';');
    const godModeCookie = cookies.find(cookie =>
        cookie.trim().startsWith('isGodMode=')
    );

    return godModeCookie ? godModeCookie.split('=')[1] === '1' : false;
};

// Feature flags for development and testing
export const FEATURE_FLAGS = {
    // Show test user selector in development or when God Mode is enabled
    SHOW_TEST_USER_SELECTOR: process.env.NODE_ENV === 'development' ||
        process.env.REACT_APP_ENABLE_TEST_FEATURES === 'true' ||
        isGodModeEnabled(),

    // Enable debug logging
    DEBUG_LOGGING: process.env.NODE_ENV === 'development' || isGodModeEnabled(),

    // Show performance metrics
    SHOW_PERFORMANCE_METRICS: process.env.REACT_APP_SHOW_PERFORMANCE === 'true' || isGodModeEnabled(),

    // Enable experimental features
    EXPERIMENTAL_FEATURES: process.env.REACT_APP_EXPERIMENTAL === 'true' || isGodModeEnabled()
};

// Helper function to check if a feature is enabled
export const isFeatureEnabled = (featureName) => {
    return FEATURE_FLAGS[featureName] || false;
};

// Helper function to enable God Mode (sets cookie)
export const enableGodMode = () => {
    document.cookie = 'isGodMode=1; path=/; max-age=86400'; // 24 hours
    window.location.reload(); // Reload to apply changes
};

// Helper function to disable God Mode (removes cookie)
export const disableGodMode = () => {
    document.cookie = 'isGodMode=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.reload(); // Reload to apply changes
};

// Helper function to check if God Mode is currently active
export const isGodMode = () => {
    return isGodModeEnabled();
};

// Helper function to log feature flag status (for debugging)
export const logFeatureFlags = () => {
    if (FEATURE_FLAGS.DEBUG_LOGGING) {
        console.log('🏁 Feature Flags:', FEATURE_FLAGS);
        console.log('🔑 God Mode Active:', isGodModeEnabled());
    }
}; 