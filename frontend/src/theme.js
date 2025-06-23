// ===================================================================
// SIMPLIFIED THEME SYSTEM
// Pre-computed color schemes with comprehensive theming
// Uses original colors from theme-old.js for UI consistency
// ALL colors change with color scheme for maximum visual impact
// ===================================================================

// Mathematical Color Transformations (from theme-old.js)
const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

const rgbToHex = (r, g, b) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

const getComplementaryColor = (hexColor) => {
    const rgb = hexToRgb(hexColor);
    if (!rgb) return hexColor;
    const compR = 255 - rgb.r;
    const compG = 255 - rgb.g;
    const compB = 255 - rgb.b;
    return rgbToHex(compR, compG, compB);
};

const getTriadicColor = (hexColor) => {
    const rgb = hexToRgb(hexColor);
    if (!rgb) return hexColor;
    return rgbToHex(rgb.b, rgb.r, rgb.g);
};

// Original Color Palette (from theme-old.js)
const originalPalette = {
    // Brand Colors
    violet: '#8B5CF6',
    blue: '#3B82F6',
    emerald: '#10B981',
    // Semantic Colors
    success: '#10B981',
    warning: '#f39c12',
    error: '#e74c3c',
    info: '#3498db',
    // Neutral Grays (Light Theme)
    gray50: '#fafafa',
    gray100: '#f5f5f5',
    gray200: '#e5e5e5',
    gray300: '#d1d5db',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',
    gray900: '#111827',
    white: '#ffffff',
    black: '#000000',
};

const originalDarkPalette = {
    // Brand Colors (brighter for dark theme)
    violet: '#a78bfa',
    blue: '#60a5fa',
    emerald: '#4ade80',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#38bdf8',
    // Dark Theme Grays (reversed)
    gray50: '#262626',
    gray100: '#323232',
    gray200: '#404040',
    gray300: '#525252',
    gray400: '#737373',
    gray500: '#a3a3a3',
    gray600: '#d4d4d4',
    gray700: '#e5e5e5',
    gray800: '#f5f5f5',
    gray900: '#ffffff',
    white: '#ffffff',
    black: '#000000',
};

// Apply transformations to create color schemes
const createColorScheme = (basePalette, transformFn = null) => {
    const transformed = { ...basePalette };

    if (transformFn) {
        // Only transform brand and semantic colors, keep grays unchanged
        const colorsToTransform = ['violet', 'blue', 'emerald', 'success', 'warning', 'error', 'info'];
        colorsToTransform.forEach(color => {
            if (transformed[color]) {
                transformed[color] = transformFn(transformed[color]);
            }
        });
    }

    return transformed;
};

// Comprehensive Color Schemes using original colors
const colorSchemes = {
    original: createColorScheme(originalPalette),
    complementary: createColorScheme(originalPalette, getComplementaryColor),
    triadic: createColorScheme(originalPalette, getTriadicColor),
};

const darkColorSchemes = {
    original: createColorScheme(originalDarkPalette),
    complementary: createColorScheme(originalDarkPalette, getComplementaryColor),
    triadic: createColorScheme(originalDarkPalette, getTriadicColor),
};

// ===================================================================
// SIMPLIFIED THEME CREATOR
// ===================================================================

const createFlatColors = (isDark, colorScheme) => {
    const colors = isDark ? darkColorSchemes[colorScheme] : colorSchemes[colorScheme];

    return {
        // Base colors (using original grays)
        background: colors.gray50,
        backgroundSecondary: colors.gray100,
        backgroundTertiary: colors.gray200,
        backgroundHover: isDark ? colors.gray300 : '#f0f9ff',

        text: colors.gray900,
        textSecondary: colors.gray600,
        textTertiary: colors.gray500,
        textMuted: colors.gray400,

        border: colors.gray300,
        borderLight: colors.gray200,

        // Brand colors (transformed by color scheme)
        primary: colors.violet,
        secondary: colors.blue,
        accent: colors.emerald,

        // Semantic colors (transformed by color scheme)
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
        info: colors.info,

        // Difficulty colors (using transformed semantics)
        difficultyEasy: colors.success,
        difficultyMedium: colors.warning,
        difficultyHard: colors.error,
        difficultyUnknown: colors.gray400,

        // Priority colors (using transformed semantics)
        priorityHigh: colors.error,
        priorityMedium: colors.warning,
        priorityLow: colors.info,

        // Priority tag backgrounds (with transparency)
        priorityHighBg: `${colors.error}20`,
        priorityMediumBg: `${colors.warning}20`,
        priorityLowBg: `${colors.info}20`,

        // Level colors (using transformed semantics)
        levelBeginner: colors.info,
        levelIntermediate: colors.warning,
        levelAdvanced: colors.error,

        // Progress/Mastery colors (using semantic colors for consistency)
        progressBeginner: colors.info,        // Blue - just starting
        progressLearning: colors.violet,      // Purple - actively learning  
        progressPracticing: colors.warning,   // Orange - practicing skills
        progressProficient: colors.success,   // Green - proficient level
        progressMastered: colors.emerald,     // Emerald - fully mastered

        // Progress backgrounds (with transparency)
        progressBeginnerBg: `${colors.info}15`,
        progressLearningBg: `${colors.violet}15`,
        progressPracticingBg: `${colors.warning}15`,
        progressProficientBg: `${colors.success}15`,
        progressMasteredBg: `${colors.emerald}15`,

        // Progress borders (with transparency)
        progressBeginnerBorder: `${colors.info}30`,
        progressLearningBorder: `${colors.violet}30`,
        progressPracticingBorder: `${colors.warning}30`,
        progressProficientBorder: `${colors.success}30`,
        progressMasteredBorder: `${colors.emerald}30`,

        // Strategy colors (using transformed colors with better contrast)
        strategyWeakArea: colors.error,        // Red - for weak areas (appropriate)
        strategyProgressive: colors.warning,   // Orange - for progression (appropriate)
        strategySpaced: colors.info,          // Blue - for repetition (appropriate)
        strategyExploration: colors.violet,   // Purple - for exploration (appropriate)
        strategyGeneral: '#64748b',          // Slate gray - subtle and professional

        // Strategy tag styling
        strategyTagTextShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
        strategyTagBorder: '1px solid rgba(255, 255, 255, 0.2)',

        // Status colors (transformed)
        statusLoading: colors.info,
        statusSuccess: colors.success,
        statusWarning: colors.warning,
        statusError: colors.error,

        // Loading and skeleton colors (using original grays)
        loadingBackground: colors.gray200,
        loadingShimmer: colors.gray100,
        skeletonBase: colors.gray300,
        skeletonHighlight: colors.gray200,

        // Notification/Toast colors (transformed)
        toastSuccess: colors.success,
        toastWarning: colors.warning,
        toastError: colors.error,
        toastInfo: colors.info,
        toastBackground: colors.gray100,
        toastBorder: colors.gray300,

        // Interactive colors (transformed)
        buttonPrimary: colors.violet,
        buttonPrimaryHover: `${colors.violet}dd`,
        buttonPrimaryActive: `${colors.violet}bb`,
        buttonPrimaryDisabled: colors.gray400,

        buttonSecondary: colors.gray500,
        buttonSecondaryHover: colors.gray400,
        buttonSecondaryActive: colors.gray300,
        buttonSecondaryDisabled: colors.gray400,

        buttonSuccess: colors.success,
        buttonSuccessHover: `${colors.success}dd`,
        buttonSuccessActive: `${colors.success}bb`,

        buttonDanger: colors.error,
        buttonDangerHover: `${colors.error}dd`,
        buttonDangerActive: `${colors.error}bb`,

        // Special colors
        white: colors.white,
        black: colors.black,

        // Gradients (using transformed colors)
        gradientPrimary: `linear-gradient(135deg, ${colors.violet} 0%, ${colors.blue} 50%, ${colors.emerald} 100%)`,
        gradientAnalysis: colorScheme === 'complementary'
            ? `linear-gradient(135deg, ${colors.blue} 0%, ${colors.violet} 100%)`  // Subtle for complementary
            : `linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)`,   // Rich Dark Purple Gradient - sophisticated and deep
        gradientProgress: `linear-gradient(90deg, ${colors.success}, ${colors.success}CC)`,
        gradientSmartRefresh: `linear-gradient(135deg, ${colors.violet} 0%, ${colors.blue} 100%)`,
        gradientFullRefresh: `linear-gradient(135deg, ${colors.error} 0%, ${colors.warning} 100%)`,

        // Shadows (using original shadow logic)
        shadowCard: isDark ? '0 4px 12px rgba(0, 0, 0, 0.5)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
        shadowCardHover: isDark ? '0 8px 24px rgba(0, 0, 0, 0.6)' : '0 4px 16px rgba(0, 0, 0, 0.12)',
        shadowButton: isDark ? '0 4px 8px rgba(0, 0, 0, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
        shadowDropdown: isDark ? '0 8px 20px rgba(0, 0, 0, 0.6)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
        shadowSmartButton: `0 4px 12px ${colors.violet}50`,
        shadowRecommendationHover: `0 4px 20px ${colors.violet}30`,

        // Interactive state colors (using original grays)
        backgroundHoverStrong: isDark ? colors.gray200 : '#e0f2fe',
        backgroundActive: isDark ? colors.gray100 : '#f8fafc',
        backgroundDisabled: colors.gray400,

        textDisabled: colors.gray400,
        textHover: colors.gray800,
        textActive: colors.gray900,

        borderHover: colors.gray400,
        borderActive: colors.gray500,
        borderFocus: colors.violet,

        // Input/Form state colors (using original grays + transformed accents)
        inputBackground: colors.gray50,
        inputBorder: colors.gray300,
        inputBorderHover: colors.gray400,
        inputBorderFocus: colors.violet,
        inputBorderError: colors.error,
        inputBorderSuccess: colors.success,
        inputText: colors.gray900,
        inputPlaceholder: colors.gray400,
        inputDisabled: colors.gray200,

        // Additional semantic colors (transformed)
        infoLight: `${colors.info}20`,
        successLight: `${colors.success}20`,
        warningLight: `${colors.warning}20`,
        errorLight: `${colors.error}20`,

        // Link colors (transformed)
        link: colors.violet,
        linkHover: `${colors.violet}dd`,
        linkVisited: `${colors.blue}aa`,
        linkActive: colors.blue,
    };
};

// ===================================================================
// MAIN THEME CREATOR
// ===================================================================

export const createTheme = (mode = 'light', colorScheme = 'original') => {
    // Resolve actual dark mode state
    const isDark = mode === 'dark';

    // Create flat colors
    const colors = createFlatColors(isDark, colorScheme);

    return {
        colors,
        mode,
        colorScheme,
        isDark,
    };
};

// ===================================================================
// USAGE EXAMPLES
// ===================================================================

/*
🎨 SIMPLIFIED USAGE:

// Component styling - super simple
const Button = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const DifficultyBadge = styled.span`
  color: ${({ theme, difficulty }) => 
    theme.colors[`difficulty${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`]
  };
`;

// Or even simpler with props
const Card = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
`;

🚀 BENEFITS:
- No getter functions needed
- No complex nesting
- Direct property access
- Pre-computed colors
- Flat structure for easy IntelliSense
- All colors available immediately
*/ 