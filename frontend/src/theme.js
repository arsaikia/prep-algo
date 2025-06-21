export const lightTheme = {
    colors: {
        // Base colors (enhanced for better card visibility following Adobe Spectrum)
        background: '#fafafa',              // Spectrum Gray-50 - subtle off-white for better card contrast
        backgroundSecondary: '#f5f5f5',     // Spectrum Gray-100 - secondary surfaces
        backgroundTertiary: '#e5e5e5',      // Spectrum Gray-200 - tertiary surfaces
        backgroundHover: '#bed4e9',
        text: '#2c3e50',
        textSecondary: '#495057',
        textTertiary: '#6c757d',
        textMuted: '#666666',
        primary: '#3498db',
        primaryDark: '#2980b9',
        secondary: '#bed4e9',
        secondaryDark: '#3373b0',
        success: '#28a745',
        successLight: '#d4edda',
        warning: '#ffc107',
        warningLight: '#fff3cd',
        error: '#dc3545',
        errorLight: '#f8d7da',
        info: '#17a2b8',
        infoLight: '#d1ecf1',
        border: '#d1d5db',              // Spectrum Gray-300 - more visible borders
        borderLight: '#e5e7eb',          // Spectrum Gray-200 - lighter borders
        hover: '#e9ecef',
        white: '#ffffff',
        black: '#2c3e50',

        // Modern Brand Colors
        brand: {
            primary: '#8B5CF6',      // Violet - main brand color
            secondary: '#3B82F6',    // Blue - secondary brand color
            accent: '#10B981',       // Emerald - accent color
            text: '#2d3748',         // Slate - main text color
            textLight: '#64748b',    // Lighter slate for secondary text
            gradient: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 50%, #10B981 100%)',
            gradientHorizontal: 'linear-gradient(90deg, #8B5CF6, #3B82F6, #10B981)',
            gradientAnalysis: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            // Complementary colors for brand
            complementary: {
                primary: '#9FE65C',      // Yellow-green (complement of violet)
                secondary: '#F6823B',    // Orange (complement of blue)
                accent: '#E610B9',       // Magenta (complement of emerald)
            }
        },

        // Algorithm/Code specific colors
        algorithm: {
            brain: '#8B5CF6',        // Purple for brain/intelligence
            spark: '#10B981',        // Green for learning/growth
            flow: '#3B82F6',         // Blue for data flow
            success: '#10B981',      // Green for success states
            processing: '#3B82F6',   // Blue for processing states
            // Complementary algorithm colors
            complementary: {
                brain: '#9FE65C',        // Yellow-green (complement of brain purple)
                spark: '#E610B9',       // Magenta (complement of spark green)
                flow: '#F6823B',        // Orange (complement of flow blue)
            }
        },

        // Difficulty levels with complementary colors
        difficulty: {
            // Original colors
            easy: '#10ac84',         // Green for easy
            medium: '#f39c12',       // Orange for medium
            hard: '#e74c3c',         // Red for hard
            unknown: '#95a5a6',      // Gray for unknown
            // Complementary difficulty colors (professional yet playful alternatives)
            complementary: {
                easy: '#ac1038',         // Deep red-pink (complement of green)
                medium: '#1238f3',       // Deep blue (complement of orange)
                hard: '#3ce7a4',         // Bright teal (complement of red)
                unknown: '#a695a5',      // Warm gray (complement of cool gray)
            },
            // Triadic colors (playful alternatives)
            triadic: {
                easy: '#8410ac',         // Purple (triadic with green)
                medium: '#f3121c',       // Bright red (triadic with orange)
                hard: '#4ce7e7',         // Cyan (triadic with red)
                unknown: '#a5a695',      // Beige (triadic with gray)
            }
        },

        // Priority levels with complementary schemes
        priority: {
            // Original high priority (red)
            high: {
                bg: '#ff6b6b',       // Red background
                text: '#ffffff',     // White text
                lightBg: '#fee',     // Light red background
                lightText: '#dc3545', // Dark red text
                // Complementary (cyan-green)
                complementary: {
                    bg: '#6bfff4',       // Cyan background
                    text: '#000000',     // Black text
                    lightBg: '#e0fffe',  // Light cyan background
                    lightText: '#0d7377', // Dark cyan text
                }
            },
            // Original medium priority (yellow)
            medium: {
                bg: '#feca57',       // Yellow background
                text: '#ffffff',     // White text
                lightBg: '#fff3cd',  // Light yellow background
                lightText: '#856404', // Dark yellow text
                // Complementary (blue-purple)
                complementary: {
                    bg: '#5770fe',       // Blue-purple background
                    text: '#ffffff',     // White text
                    lightBg: '#e8ebff',  // Light blue-purple background
                    lightText: '#2d1b85', // Dark blue-purple text
                }
            },
            // Original low priority (blue)
            low: {
                bg: '#48dbfb',       // Blue background
                text: '#ffffff',     // White text
                lightBg: '#d1ecf1',  // Light blue background
                lightText: '#0c5460', // Dark blue text
                // Complementary (orange)
                complementary: {
                    bg: '#fb7548',       // Orange background
                    text: '#ffffff',     // White text
                    lightBg: '#ffeee8',  // Light orange background
                    lightText: '#7a2e1a', // Dark orange text
                }
            }
        },

        // User levels with complementary colors
        level: {
            // Original colors
            beginner: '#48dbfb',     // Blue for beginners
            intermediate: '#feca57', // Yellow for intermediate
            advanced: '#ff6b6b',     // Red for advanced
            // Complementary colors (professional alternatives)
            complementary: {
                beginner: '#fb7548',     // Orange (complement of blue)
                intermediate: '#5770fe', // Blue-purple (complement of yellow)
                advanced: '#6bfff4',     // Cyan (complement of red)
            },
            // Analogous colors (harmonious alternatives)
            analogous: {
                beginner: '#48a3fb',     // Light blue (analogous to blue)
                intermediate: '#fea357', // Orange-yellow (analogous to yellow)
                advanced: '#ff4848',     // Pure red (analogous to red)
            }
        },

        // Recommendation strategies with complementary schemes
        strategy: {
            // Original colors (enhanced for better contrast with white text)
            weakArea: '#dc2626',           // Darker red for better contrast
            progressive: '#d97706',        // Darker orange for better contrast  
            spaced: '#1d4ed8',             // Darker blue for better contrast
            exploration: '#7c3aed',        // Darker purple for better contrast
            general: '#16a34a',            // Darker green for better contrast
            // Complementary colors
            complementary: {
                weakArea: '#059669',           // Teal (complement of red)
                progressive: '#1d4ed8',        // Blue (complement of orange)
                spaced: '#d97706',             // Orange (complement of blue)
                exploration: '#16a34a',        // Green (complement of purple)
                general: '#dc2626',            // Red (complement of green)
            },
            // Triadic colors (playful alternatives)
            triadic: {
                weakArea: '#16a34a',           // Green (triadic with red)
                progressive: '#7c3aed',        // Purple (triadic with orange)
                spaced: '#dc2626',             // Red (triadic with blue)
                exploration: '#d97706',        // Orange (triadic with purple)
                general: '#1d4ed8',            // Blue (triadic with green)
            }
        },

        // Status and feedback colors with complementary schemes
        status: {
            // Original colors
            loading: '#3498db',      // Blue for loading
            success: '#2ecc71',      // Green for success
            warning: '#f1c40f',      // Yellow for warning
            error: '#e74c3c',        // Red for error
            info: '#3498db',         // Blue for info
            // Complementary colors
            complementary: {
                loading: '#db9834',      // Orange (complement of blue)
                success: '#cc2e8a',      // Magenta (complement of green)
                warning: '#400ff1',      // Blue-purple (complement of yellow)
                error: '#3ce7a4',        // Teal (complement of red)
                info: '#db9834',         // Orange (complement of blue)
            },
            // Analogous colors (harmonious alternatives)
            analogous: {
                loading: '#3463db',      // Blue-purple (analogous to blue)
                success: '#2ecc9a',      // Blue-green (analogous to green)
                warning: '#f1a40f',      // Orange (analogous to yellow)
                error: '#e73c74',        // Pink (analogous to red)
                info: '#34c3db',         // Cyan (analogous to blue)
            }
        },

        // Interactive elements with complementary schemes
        interactive: {
            // Original colors
            cardBorder: '#f8f9fa',
            cardBorderHover: '#3498db',
            cardShadow: 'rgba(0, 0, 0, 0.05)',
            cardShadowHover: 'rgba(52, 152, 219, 0.15)',
            buttonPrimary: '#3498db',
            buttonPrimaryHover: '#2980b9',
            buttonSuccess: '#28a745',
            buttonSuccessHover: '#218838',
            buttonSecondary: '#6c757d',
            buttonSecondaryHover: '#5a6268',
            // Complementary interactive colors
            complementary: {
                cardBorderHover: '#db9834',              // Orange (complement of blue)
                cardShadowHover: 'rgba(219, 152, 52, 0.15)', // Orange shadow
                buttonPrimary: '#db9834',                // Orange button
                buttonPrimaryHover: '#b9802d',           // Darker orange
                buttonSuccess: '#a72845',                // Magenta (complement of green)
                buttonSuccessHover: '#882137',           // Darker magenta
            }
        },

        // Recommendation page specific colors (enhanced for better visibility)
        recommendations: {
            // Card colors (improved following Adobe Spectrum guidelines)
            cardBackground: '#ffffff',           // Pure white background
            cardBorder: '#d1d5db',              // Spectrum Gray-300 equivalent - visible border
            cardBorderHover: '#3498db',         // Brand blue for hover
            cardShadow: 'rgba(0, 0, 0, 0.1)',   // More visible shadow
            cardShadowHover: 'rgba(52, 152, 219, 0.2)', // Stronger hover shadow
            // Analysis section
            analysisGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            analysisText: '#ffffff',
            // Complementary recommendation colors
            complementary: {
                cardBorderHover: '#db9834',
                cardShadowHover: 'rgba(219, 152, 52, 0.2)',
                analysisGradient: 'linear-gradient(135deg, #ea8166 0%, #a27b64 100%)',
            },
            // Professional playful alternatives
            playful: {
                cardBorderHover: '#ff6b94',
                cardShadowHover: 'rgba(255, 107, 148, 0.2)',
                analysisGradient: 'linear-gradient(135deg, #ff6b94 0%, #4ecdc4 100%)',
            }
        },

        // Shadows and effects (enhanced for better visibility)
        shadows: {
            card: '0 2px 8px rgba(0, 0, 0, 0.08)',           // More visible card shadow
            cardHover: '0 4px 20px rgba(52, 152, 219, 0.2)', // Stronger hover shadow
            button: '0 2px 4px rgba(0, 0, 0, 0.1)',          // Button shadows
            dropdown: '0 4px 12px rgba(0, 0, 0, 0.15)',      // Dropdown shadows
            // Complementary shadows
            complementary: {
                cardHover: '0 4px 20px rgba(219, 152, 52, 0.2)',
                playful: '0 4px 20px rgba(255, 107, 148, 0.2)',
            }
        },

        gray: {
            50: '#f8f9fa',
            100: '#e9ecef',
            200: '#dee2e6',
            300: '#ced4da',
            400: '#adb5bd',
            500: '#6c757d',
            600: '#495057',
            700: '#343a40',
            800: '#212529',
            900: '#1c2127',
        }
    },
};

export const darkTheme = {
    colors: {
        // Base colors (updated with lighter, more accessible shades following Adobe Spectrum principles)
        background: '#242424',          // Lighter dark background for better visibility
        backgroundSecondary: '#2e2e2e',  // Slightly lighter secondary surfaces
        backgroundTertiary: '#383838',   // Lighter tertiary surfaces for better contrast
        backgroundHover: '#484848',      // Lighter hover states

        // Special lighter backgrounds for navbar and cards
        navbarBackground: '#2a2a2a',     // Consistent with lighter theme
        cardBackground: '#323232',       // Cards stand out from main background

        text: '#ffffff',                // Pure white for maximum contrast
        textSecondary: '#e5e5e5',       // Lighter secondary text for better readability
        textTertiary: '#b3b3b3',        // Lighter tertiary text for better contrast
        textMuted: '#8a8a8a',           // Lighter muted text while maintaining hierarchy
        primary: '#60a5fa',             // Slightly lighter blue for better contrast
        primaryDark: '#3b82f6',         // Darker blue for hover states
        secondary: '#d4d4d4',           // Light gray for secondary elements
        secondaryDark: '#a3a3a3',       // Darker gray for secondary hover
        success: '#4ade80',             // Bright green for success states
        successLight: '#166534',        // Dark green background for success alerts
        warning: '#fbbf24',             // Bright yellow for warnings
        warningLight: '#451a03',        // Dark amber background for warning alerts
        error: '#f87171',               // Bright red for errors
        errorLight: '#451a1a',          // Dark red background for error alerts
        info: '#38bdf8',                // Bright cyan for info
        infoLight: '#164e63',           // Dark cyan background for info alerts
        border: '#404040',              // Spectrum Gray-400 - visible but subtle borders
        borderLight: '#323232',         // Spectrum Gray-300 - lighter borders
        hover: '#404040',               // Consistent hover color
        white: '#f5f5f5',               // Off-white instead of pure white
        black: '#1a1a1a',               // Consistent with background

        // Modern Brand Colors (adjusted for better dark mode contrast)
        brand: {
            primary: '#a78bfa',          // Lighter violet for better visibility
            secondary: '#60a5fa',        // Lighter blue for better visibility
            accent: '#4ade80',           // Lighter emerald for better visibility
            text: '#f5f5f5',             // High contrast text
            textLight: '#d4d4d4',        // Secondary text with good contrast
            gradient: 'linear-gradient(135deg, #a78bfa 0%, #60a5fa 50%, #4ade80 100%)',
            gradientHorizontal: 'linear-gradient(90deg, #a78bfa, #60a5fa, #4ade80)',
            gradientAnalysis: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
            // Complementary colors for brand (dark theme)
            complementary: {
                primary: '#bafa8b',      // Light yellow-green (complement of violet)
                secondary: '#fa8560',    // Light orange (complement of blue)
                accent: '#fa34d3',       // Light magenta (complement of emerald)
            }
        },

        // Algorithm/Code specific colors (enhanced for dark mode)
        algorithm: {
            brain: '#a78bfa',            // Lighter purple for dark theme
            spark: '#4ade80',            // Lighter green for dark theme
            flow: '#60a5fa',             // Lighter blue for dark theme
            success: '#4ade80',          // Bright green for success
            processing: '#60a5fa',       // Bright blue for processing
            // Complementary algorithm colors (dark theme)
            complementary: {
                brain: '#bafa8b',        // Light yellow-green (complement of brain purple)
                spark: '#fa34d3',       // Light magenta (complement of spark green)
                flow: '#fa8560',        // Light orange (complement of flow blue)
            }
        },

        // Difficulty levels (dark theme) with complementary colors
        difficulty: {
            // Original colors (enhanced for dark mode visibility)
            easy: '#4ade80',             // Bright green for easy
            medium: '#fbbf24',           // Bright amber for medium
            hard: '#f87171',             // Bright red for hard
            unknown: '#a3a3a3',          // Medium gray for unknown
            // Complementary difficulty colors (dark theme)
            complementary: {
                easy: '#f87171',         // Bright red-pink (complement of green)
                medium: '#3b82f6',       // Bright blue (complement of amber)
                hard: '#4ade80',         // Bright green (complement of red)
                unknown: '#d4d4d4',      // Light gray (complement of medium gray)
            },
            // Triadic colors (dark theme)
            triadic: {
                easy: '#a78bfa',         // Light purple (triadic with green)
                medium: '#f87171',       // Bright red (triadic with amber)
                hard: '#38bdf8',         // Bright cyan (triadic with red)
                unknown: '#d4d4d4',      // Light gray (triadic alternative)
            }
        },

        // Priority levels (dark theme) with complementary schemes
        priority: {
            // Original high priority (red) - dark theme
            high: {
                bg: '#dc2626',           // Vibrant red background
                text: '#ffffff',         // White text
                lightBg: '#451a1a',      // Dark red background (Spectrum equivalent)
                lightText: '#f87171',    // Light red text
                // Complementary (cyan-green) - dark theme
                complementary: {
                    bg: '#059669',           // Vibrant teal background
                    text: '#ffffff',         // White text
                    lightBg: '#1a453d',      // Dark teal background
                    lightText: '#4ade80',    // Light teal text
                }
            },
            // Original medium priority (yellow) - dark theme
            medium: {
                bg: '#d97706',           // Vibrant amber background
                text: '#ffffff',         // White text
                lightBg: '#451a03',      // Dark amber background (Spectrum equivalent)
                lightText: '#fbbf24',    // Light amber text
                // Complementary (blue-purple) - dark theme
                complementary: {
                    bg: '#1d4ed8',           // Vibrant blue background
                    text: '#ffffff',         // White text
                    lightBg: '#1e293b',      // Dark blue background
                    lightText: '#60a5fa',    // Light blue text
                }
            },
            // Original low priority (blue) - dark theme
            low: {
                bg: '#0284c7',           // Vibrant blue background
                text: '#ffffff',         // White text
                lightBg: '#164e63',      // Dark blue background (Spectrum equivalent)
                lightText: '#38bdf8',    // Light blue text
                // Complementary (orange) - dark theme
                complementary: {
                    bg: '#ea580c',           // Vibrant orange background
                    text: '#ffffff',         // White text
                    lightBg: '#431407',      // Dark orange background
                    lightText: '#fb923c',    // Light orange text
                }
            }
        },

        // User levels (dark theme) with complementary colors
        level: {
            // Original colors (enhanced for dark mode)
            beginner: '#38bdf8',         // Bright cyan for beginners
            intermediate: '#fbbf24',     // Bright amber for intermediate
            advanced: '#f87171',         // Bright red for advanced
            // Complementary colors (dark theme)
            complementary: {
                beginner: '#fb923c',     // Light orange (complement of cyan)
                intermediate: '#3b82f6', // Light blue (complement of amber)
                advanced: '#4ade80',     // Light green (complement of red)
            },
            // Analogous colors (dark theme)
            analogous: {
                beginner: '#0ea5e9',     // Sky blue (analogous to cyan)
                intermediate: '#f59e0b', // Orange (analogous to amber)
                advanced: '#ef4444',     // Red (analogous to red)
            }
        },

        // Recommendation strategies (dark theme) with complementary schemes
        strategy: {
            // Original colors (enhanced for dark mode with better contrast)
            weakArea: '#f87171',           // Bright red for weak area reinforcement - Good contrast
            progressive: '#d97706',        // Darker amber for better contrast with white text
            spaced: '#0284c7',             // Darker blue for better contrast with white text
            exploration: '#8b5cf6',        // Darker purple for better contrast with white text
            general: '#16a34a',            // Darker green for better contrast with white text
            // Complementary colors (dark theme - enhanced for better contrast)
            complementary: {
                weakArea: '#16a34a',           // Darker green for better contrast
                progressive: '#1d4ed8',        // Darker blue for better contrast
                spaced: '#d97706',             // Darker orange for better contrast
                exploration: '#059669',        // Darker teal for better contrast
                general: '#dc2626',            // Darker red for better contrast
            },
            // Triadic colors (dark theme - enhanced for better contrast)
            triadic: {
                weakArea: '#16a34a',           // Darker green for better contrast
                progressive: '#7c3aed',        // Darker purple for better contrast
                spaced: '#dc2626',             // Darker red for better contrast
                exploration: '#d97706',        // Darker orange for better contrast
                general: '#1d4ed8',            // Darker blue for better contrast
            }
        },

        // Status and feedback colors (dark theme) with complementary schemes
        status: {
            // Original colors (enhanced for dark mode)
            loading: '#38bdf8',          // Bright cyan for loading
            success: '#4ade80',          // Bright green for success
            warning: '#fbbf24',          // Bright amber for warning
            error: '#f87171',            // Bright red for error
            info: '#38bdf8',             // Bright cyan for info
            // Complementary colors (dark theme)
            complementary: {
                loading: '#fb923c',      // Light orange (complement of cyan)
                success: '#f87171',      // Bright red (complement of green)
                warning: '#3b82f6',      // Bright blue (complement of amber)
                error: '#4ade80',        // Bright green (complement of red)
                info: '#fb923c',         // Light orange (complement of cyan)
            },
            // Analogous colors (dark theme)
            analogous: {
                loading: '#0ea5e9',      // Sky blue (analogous to cyan)
                success: '#22c55e',      // Green (analogous to green)
                warning: '#f59e0b',      // Orange (analogous to amber)
                error: '#ef4444',        // Red (analogous to red)
                info: '#06b6d4',         // Cyan (analogous to cyan)
            }
        },

        // Interactive elements (dark theme) with complementary schemes
        interactive: {
            // Original colors (enhanced for dark mode)
            cardBorder: '#323232',       // Spectrum Gray-300 equivalent
            cardBorderHover: '#60a5fa',  // Bright blue for hover
            cardShadow: 'rgba(0, 0, 0, 0.5)',     // Deeper shadow for dark mode
            cardShadowHover: 'rgba(96, 165, 250, 0.3)', // Blue glow shadow
            buttonPrimary: '#60a5fa',    // Bright blue button
            buttonPrimaryHover: '#3b82f6', // Darker blue hover
            buttonSuccess: '#4ade80',    // Bright green button
            buttonSuccessHover: '#22c55e', // Darker green hover
            buttonSecondary: '#a3a3a3',  // Light gray button
            buttonSecondaryHover: '#d4d4d4', // Lighter gray hover
            // Complementary interactive colors (dark theme)
            complementary: {
                cardBorderHover: '#fb923c',              // Orange (complement of blue)
                cardShadowHover: 'rgba(251, 146, 60, 0.3)', // Orange glow shadow
                buttonPrimary: '#fb923c',                // Orange button
                buttonPrimaryHover: '#ea580c',           // Darker orange
                buttonSuccess: '#f87171',                // Red (complement of green)
                buttonSuccessHover: '#ef4444',           // Darker red
            }
        },

        // Recommendation page specific colors (dark theme)
        recommendations: {
            // Card colors (enhanced for dark mode with lighter backgrounds)
            cardBackground: '#2e2e2e',   // Lighter than secondary background for better contrast
            cardBorder: '#404040',       // Spectrum Gray-400 for better visibility
            cardBorderHover: '#60a5fa',  // Bright blue hover
            cardShadow: 'rgba(0, 0, 0, 0.5)',         // Deeper shadow
            cardShadowHover: 'rgba(96, 165, 250, 0.3)', // Blue glow
            // Analysis section (enhanced gradient for dark mode)
            analysisGradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
            analysisText: '#f5f5f5',     // High contrast text
            // Complementary recommendation colors (dark theme)
            complementary: {
                cardBorderHover: '#fb923c',
                cardShadowHover: 'rgba(251, 146, 60, 0.3)',
                analysisGradient: 'linear-gradient(135deg, #fb7185 0%, #f59e0b 100%)',
            },
            // Professional playful alternatives (dark theme)
            playful: {
                cardBorderHover: '#ec4899',
                cardShadowHover: 'rgba(236, 72, 153, 0.3)',
                analysisGradient: 'linear-gradient(135deg, #ec4899 0%, #06b6d4 100%)',
            }
        },

        // Shadows and effects (enhanced for dark mode)
        shadows: {
            card: '0 4px 12px rgba(0, 0, 0, 0.5)',         // Deeper shadows
            cardHover: '0 8px 25px rgba(96, 165, 250, 0.3)', // Blue glow
            button: '0 4px 8px rgba(0, 0, 0, 0.3)',        // Button shadows
            dropdown: '0 8px 20px rgba(0, 0, 0, 0.6)',     // Deep dropdown shadow
            // Complementary shadows (dark theme)
            complementary: {
                cardHover: '0 8px 25px rgba(251, 146, 60, 0.3)', // Orange glow
                playful: '0 8px 25px rgba(236, 72, 153, 0.3)',   // Pink glow
            }
        },

        // Enhanced gray scale following Spectrum principles
        gray: {
            50: '#262626',   // Spectrum Gray-200 - darkest surface
            100: '#323232',  // Spectrum Gray-300 - elevated surface
            200: '#404040',  // Spectrum Gray-400 - interactive elements
            300: '#525252',  // Spectrum Gray-500 - borders/dividers
            400: '#737373',  // Spectrum Gray-600 - disabled text
            500: '#a3a3a3',  // Spectrum Gray-700 - secondary text
            600: '#d4d4d4',  // Spectrum Gray-800 - primary text
            700: '#e5e5e5',  // Spectrum Gray-900 - high emphasis text
            800: '#f5f5f5',  // Near white - highest emphasis
            900: '#ffffff',  // Pure white - reserved for highest contrast
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

/* 
=== COMPREHENSIVE THEME USAGE GUIDE ===

🎨 BRAND COLORS:
theme.colors.brand.primary          // Main brand color (#8B5CF6)
theme.colors.brand.secondary        // Secondary brand color (#3B82F6)  
theme.colors.brand.accent           // Accent color (#10B981)
theme.colors.brand.gradient         // Diagonal gradient
theme.colors.brand.gradientHorizontal // Horizontal gradient
theme.colors.brand.gradientAnalysis // Analysis section gradient

🧠 ALGORITHM COLORS:
theme.colors.algorithm.brain        // Brain/intelligence (#8B5CF6)
theme.colors.algorithm.spark        // Learning/growth (#10B981)
theme.colors.algorithm.flow         // Data flow (#3B82F6)
theme.colors.algorithm.success      // Success states (#10B981)
theme.colors.algorithm.processing   // Processing states (#3B82F6)

📊 DIFFICULTY COLORS:
theme.colors.difficulty.easy        // Easy problems (#10ac84)
theme.colors.difficulty.medium      // Medium problems (#f39c12)
theme.colors.difficulty.hard        // Hard problems (#e74c3c)
theme.colors.difficulty.unknown     // Unknown difficulty (#95a5a6)

🎯 PRIORITY COLORS:
theme.colors.priority.high.bg       // High priority background
theme.colors.priority.high.text     // High priority text
theme.colors.priority.high.lightBg  // High priority light background
theme.colors.priority.high.lightText // High priority light text
// (same structure for medium and low)

👤 USER LEVEL COLORS:
theme.colors.level.beginner         // Beginner level (#48dbfb)
theme.colors.level.intermediate     // Intermediate level (#feca57)
theme.colors.level.advanced         // Advanced level (#ff6b6b)

🎲 STRATEGY COLORS:
theme.colors.strategy.weakArea      // Weak area reinforcement
theme.colors.strategy.progressive   // Progressive difficulty
theme.colors.strategy.spaced        // Spaced repetition
theme.colors.strategy.exploration   // Topic exploration
theme.colors.strategy.general       // General practice

📱 INTERACTIVE ELEMENTS:
theme.colors.interactive.cardBorder       // Card borders
theme.colors.interactive.cardBorderHover  // Card borders on hover
theme.colors.interactive.cardShadow       // Card shadows
theme.colors.interactive.cardShadowHover  // Card shadows on hover
theme.colors.interactive.buttonPrimary    // Primary buttons
theme.colors.interactive.buttonSuccess    // Success buttons

🎭 SHADOWS:
theme.colors.shadows.card           // Card shadows
theme.colors.shadows.cardHover      // Card hover shadows
theme.colors.shadows.button         // Button shadows
theme.colors.shadows.dropdown       // Dropdown shadows

📝 USAGE EXAMPLES:

// Recommendation Card:
const RecommendationCard = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border: 2px solid ${({ theme }) => theme.colors.interactive.cardBorder};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.colors.shadows.card};
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.interactive.cardBorderHover};
    box-shadow: ${({ theme }) => theme.colors.shadows.cardHover};
  }
`;

// Priority Indicator:
const PriorityBadge = styled.span`
  background: ${({ theme, priority }) => theme.colors.priority[priority].bg};
  color: ${({ theme, priority }) => theme.colors.priority[priority].text};
`;

// Difficulty Badge:
const DifficultyBadge = styled.span`
  color: ${({ theme, difficulty }) => theme.colors.difficulty[difficulty.toLowerCase()]};
`;

// Strategy Icon:
const StrategyIcon = styled.div`
  color: ${({ theme, strategy }) => theme.colors.strategy[strategy]};
`;

// Analysis Section:
const AnalysisSection = styled.div`
  background: ${({ theme }) => theme.colors.brand.gradientAnalysis};
  color: ${({ theme }) => theme.colors.white};
`;

*/ 