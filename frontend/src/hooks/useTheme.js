import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setSystemTheme, setUserThemePreference } from '../actions/actions';

export const useTheme = () => {
  const dispatch = useDispatch();
  const { isDarkModeEnabled, userPreference, systemPrefersDark } = useSelector(
    (state) => state.theme
  );

  // Set up system theme change listener
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleSystemThemeChange = (e) => {
        dispatch(setSystemTheme(e.matches));
      };

      // Listen for system theme changes
      mediaQuery.addEventListener('change', handleSystemThemeChange);

      // Initial system theme detection
      dispatch(setSystemTheme(mediaQuery.matches));

      // Cleanup listener on unmount
      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      };
    }
  }, [dispatch]);

  // Theme control functions
  const setTheme = (preference) => {
    // preference can be 'light', 'dark', or null (for system)
    dispatch(setUserThemePreference(preference));
  };

  const toggleTheme = () => {
    if (userPreference === null) {
      // Currently following system, set to opposite of system
      setTheme(systemPrefersDark ? 'light' : 'dark');
    } else if (userPreference === 'light') {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  };

  const followSystem = () => {
    setTheme(null);
  };

  return {
    // State
    isDarkModeEnabled,
    userPreference, // null = system, 'light' = light, 'dark' = dark
    systemPrefersDark,
    isFollowingSystem: userPreference === null,
    
    // Actions
    setTheme,
    toggleTheme,
    followSystem,
    setLight: () => setTheme('light'),
    setDark: () => setTheme('dark'),
  };
};

export default useTheme;
