import { keyframes } from 'styled-components';

// Slide up animation for the main container
export const slideUp = keyframes`
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

// Sparkle floating animation
export const sparkleFloat = keyframes`
    0%, 100% { 
        transform: translateY(0px) rotate(0deg);
        filter: brightness(1);
    }
    25% { 
        transform: translateY(-2px) rotate(5deg);
        filter: brightness(1.2);
    }
    50% { 
        transform: translateY(-4px) rotate(-3deg);
        filter: brightness(1.4);
    }
    75% { 
        transform: translateY(-2px) rotate(3deg);
        filter: brightness(1.2);
    }
`;

// Sparkle glow animation
export const sparkleGlow = keyframes`
    0%, 100% { 
        text-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
    }
    50% { 
        text-shadow: 0 0 16px rgba(255, 255, 255, 0.8), 0 0 24px rgba(255, 255, 255, 0.4);
    }
`; 