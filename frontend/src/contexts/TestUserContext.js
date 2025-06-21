import React, { createContext, useContext, useState, useEffect } from 'react';
import { isFeatureEnabled, isGodMode } from '../utils/featureFlags';

const TestUserContext = createContext();

export const useTestUser = () => {
    const context = useContext(TestUserContext);
    if (!context) {
        throw new Error('useTestUser must be used within a TestUserProvider');
    }
    return context;
};

export const TestUserProvider = ({ children }) => {
    // Default to Carol Advanced for testing (has good completion data)
    const [selectedUserId, setSelectedUserId] = useState('test-carol-advanced-003');
    const [isTestMode, setIsTestMode] = useState(false);

    // Check test mode status (reactive to cookie changes)
    useEffect(() => {
        const checkTestMode = () => {
            const testModeEnabled = isFeatureEnabled('SHOW_TEST_USER_SELECTOR');
            setIsTestMode(testModeEnabled);

            // Load saved user ID from localStorage if test mode is enabled
            if (testModeEnabled) {
                const savedUserId = localStorage.getItem('selectedTestUserId');
                if (savedUserId) {
                    setSelectedUserId(savedUserId);
                }
            }
        };

        // Initial check
        checkTestMode();

        // Listen for cookie changes (when God Mode is toggled)
        const interval = setInterval(checkTestMode, 1000);

        return () => clearInterval(interval);
    }, []);

    const changeUser = (userId) => {
        setSelectedUserId(userId);
        if (isTestMode) {
            localStorage.setItem('selectedTestUserId', userId);
        }
    };

    return (
        <TestUserContext.Provider
            value={{
                selectedUserId,
                changeUser,
                isTestMode,
                isGodMode: isGodMode()
            }}
        >
            {children}
        </TestUserContext.Provider>
    );
}; 