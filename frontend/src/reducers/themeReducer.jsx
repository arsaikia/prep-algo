/* eslint-disable default-param-last */
import {
  SET_DARK_MODE,
  SET_LIGHT_MODE,
  INITIALIZE_THEME,
  SET_SYSTEM_THEME,
  SET_USER_THEME_PREFERENCE,
} from '../actions/types';

// Helper functions for localStorage
const getStoredThemePreference = () => {
  try {
    return localStorage.getItem('themePreference');
  } catch (error) {
    console.warn('Failed to read theme preference from localStorage:', error);
    return null;
  }
};

const setStoredThemePreference = (preference) => {
  try {
    if (preference === null) {
      localStorage.removeItem('themePreference');
    } else {
      localStorage.setItem('themePreference', preference);
    }
  } catch (error) {
    console.warn('Failed to save theme preference to localStorage:', error);
  }
};

// Detect system theme preference
const getSystemThemePreference = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false; // Default to light theme if system detection fails
};

// Determine initial theme state
const getInitialThemeState = () => {
  const storedPreference = getStoredThemePreference();
  const systemPrefersDark = getSystemThemePreference();
  
  let isDarkModeEnabled;
  let userPreference = storedPreference;
  
  if (storedPreference === null) {
    // No user preference stored, use system preference
    isDarkModeEnabled = systemPrefersDark;
    userPreference = null; // null means "follow system"
  } else {
    // User has a stored preference
    isDarkModeEnabled = storedPreference === 'dark';
  }
  
  return {
    isDarkModeEnabled,
    userPreference, // null = system, 'light' = light, 'dark' = dark
    systemPrefersDark,
  };
};

const initialState = getInitialThemeState();

const themeReducer = (state = initialState, action) => {
  switch (action.type) {
    case INITIALIZE_THEME: {
      // Re-initialize theme state (useful for handling system theme changes)
      const newState = getInitialThemeState();
      return {
        ...state,
        ...newState,
      };
    }

    case SET_SYSTEM_THEME: {
      const systemPrefersDark = action.payload;
      const newState = {
        ...state,
        systemPrefersDark,
      };
      
      // If user preference is null (follow system), update isDarkModeEnabled
      if (state.userPreference === null) {
        newState.isDarkModeEnabled = systemPrefersDark;
      }
      
      return newState;
    }

    case SET_USER_THEME_PREFERENCE: {
      const preference = action.payload; // 'light', 'dark', or null
      
      // Save to localStorage
      setStoredThemePreference(preference);
      
      let isDarkModeEnabled;
      if (preference === null) {
        // Follow system preference
        isDarkModeEnabled = state.systemPrefersDark;
      } else {
        // Use user preference
        isDarkModeEnabled = preference === 'dark';
      }
      
      return {
        ...state,
        userPreference: preference,
        isDarkModeEnabled,
      };
    }

    case SET_DARK_MODE: {
      // Legacy support - sets user preference to dark
      setStoredThemePreference('dark');
      return {
        ...state,
        isDarkModeEnabled: true,
        userPreference: 'dark',
      };
    }

    case SET_LIGHT_MODE: {
      // Legacy support - sets user preference to light
      setStoredThemePreference('light');
      return {
        ...state,
        isDarkModeEnabled: false,
        userPreference: 'light',
      };
    }

    default:
      return state;
  }
};

export default themeReducer;
