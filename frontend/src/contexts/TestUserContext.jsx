import React, { createContext, useContext, useState, useEffect } from 'react';
import { isDevMode } from '../utils/featureFlags';

/**
 * DEV MODE & TEST USER SYSTEM
 * 
 * This context manages the test user selection system for development purposes.
 * It works in conjunction with user ID selection logic across the app.
 * 
 * SINGLE-CONDITION SYSTEM:
 * - isDevMode(): Cookie-based feature flag (devMode=1) - controls access to dev features
 * - selectedUserId: null (use auth account) or test user ID
 * 
 * USER ID PRIORITY (in Home, AllQuestions, CodeSandbox):
 * 1. DEV OVERRIDE: if (isDevMode() && selectedUserId) → Use test user
 * 2. AUTHENTICATED: if (isAuthenticated && authUserId !== 'guest') → Use real user
 * 3. FALLBACK: Use guest or handle auth bugs
 * 
 * This ensures:
 * - Normal users never see test user data (no devMode cookie)
 * - Developers default to their authenticated account
 * - Developers can optionally select test users for testing
 * - Simple, clear logic with single source of truth
 */

const TestUserContext = createContext();

export const useTestUser = () => {
    const context = useContext(TestUserContext);
    if (!context) {
        throw new Error('useTestUser must be used within a TestUserProvider');
    }
    return context;
};

export const TestUserProvider = ({ children }) => {
    // Default to null (use authenticated account) - developers can select test users if needed
    const [selectedUserId, setSelectedUserId] = useState(null);

    // Load saved user ID from localStorage on mount
    useEffect(() => {
        if (isDevMode()) {
            const savedUserId = localStorage.getItem('selectedTestUserId');
            if (savedUserId) {
                // Handle both null string and actual values
                setSelectedUserId(savedUserId === 'null' ? null : savedUserId);
            }
        }
    }, []);

    const changeUser = (userId) => {
        setSelectedUserId(userId);
        // Save to localStorage when in dev mode
        if (isDevMode()) {
            localStorage.setItem('selectedTestUserId', userId || 'null');
        }
    };

    return (
        <TestUserContext.Provider
            value={{
                selectedUserId,
                changeUser,
                isDevMode: isDevMode()
            }}
        >
            {children}
        </TestUserContext.Provider>
    );
}; 