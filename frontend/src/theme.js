export const lightTheme = {
    colors: {
        background: '#e7f1fb',
        backgroundSecondary: '#f5f5f5',
        backgroundHover: '#bed4e9',
        text: '#1c2127',
        textSecondary: '#666666',
        primary: '#3373b0',
        primaryDark: '#0b385f',
        secondary: '#bed4e9',
        secondaryDark: '#3373b0',
        success: '#2e7d32',
        warning: '#ed6c02',
        error: '#d32f2f',
        errorDark: '#b71c1c',
        border: 'rgba(27, 33, 39, 0.12)',
        hover: '#bed4e9',
        white: '#ffffff',
        black: '#1c2127',

        // Modern Brand Colors
        brand: {
            primary: '#8B5CF6',      // Violet - main brand color
            secondary: '#3B82F6',    // Blue - secondary brand color
            accent: '#10B981',       // Emerald - accent color
            text: '#2d3748',         // Slate - main text color
            textLight: '#64748b',    // Lighter slate for secondary text
            gradient: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 50%, #10B981 100%)',
            gradientHorizontal: 'linear-gradient(90deg, #8B5CF6, #3B82F6, #10B981)',
        },

        // Algorithm/Code specific colors
        algorithm: {
            brain: '#8B5CF6',        // Purple for brain/intelligence
            spark: '#10B981',        // Green for learning/growth
            flow: '#3B82F6',         // Blue for data flow
            success: '#10B981',      // Green for success states
            processing: '#3B82F6',   // Blue for processing states
        },

        gray: {
            100: '#e7f1fb',
            200: '#bed4e9',
            300: '#3373b0',
            400: '#0b385f',
            500: '#1c2127',
            600: '#1c2127',
            700: '#1c2127',
            800: '#1c2127',
            900: '#1c2127',
        }
    },
};

export const darkTheme = {
    colors: {
        background: '#121212',
        backgroundSecondary: '#1a1a1a',
        backgroundHover: '#2a2a2a',
        text: '#E0E0E0',
        textSecondary: '#B0B0B0',
        primary: '#4a90e2',
        primaryDark: '#3a7bc8',
        secondary: '#B0B0B0',
        secondaryDark: '#888888',
        success: '#66bb6a',
        warning: '#ffa726',
        error: '#ef5350',
        errorDark: '#d32f2f',
        border: '#444444',
        hover: '#1a1a1a',
        white: '#E0E0E0',
        black: '#121212',

        // Modern Brand Colors (adjusted for dark theme)
        brand: {
            primary: '#a78bfa',      // Lighter violet for dark theme
            secondary: '#60a5fa',    // Lighter blue for dark theme
            accent: '#34d399',       // Lighter emerald for dark theme
            text: '#e2e8f0',         // Light slate for dark theme text
            textLight: '#94a3b8',    // Medium slate for secondary text
            gradient: 'linear-gradient(135deg, #a78bfa 0%, #60a5fa 50%, #34d399 100%)',
            gradientHorizontal: 'linear-gradient(90deg, #a78bfa, #60a5fa, #34d399)',
        },

        // Algorithm/Code specific colors (dark theme variants)
        algorithm: {
            brain: '#a78bfa',        // Lighter purple for dark theme
            spark: '#34d399',        // Lighter green for dark theme
            flow: '#60a5fa',         // Lighter blue for dark theme
            success: '#34d399',      // Lighter green for success
            processing: '#60a5fa',   // Lighter blue for processing
        },

        gray: {
            100: '#E0E0E0',
            200: '#B0B0B0',
            300: '#888888',
            400: '#444444',
            500: '#121212',
            600: '#121212',
            700: '#121212',
            800: '#121212',
            900: '#121212',
        }
    },
};

// Usage Examples:
// 
// For styled-components:
// color: ${({ theme }) => theme.colors.brand.primary};
// background: ${({ theme }) => theme.colors.brand.gradient};
// 
// For algorithm-related elements:
// color: ${({ theme }) => theme.colors.algorithm.brain};
// box-shadow: 0 0 10px ${({ theme }) => theme.colors.algorithm.spark};
//
// For success/processing states:
// color: ${({ theme }) => theme.colors.algorithm.success};
// border-color: ${({ theme }) => theme.colors.algorithm.processing}; 