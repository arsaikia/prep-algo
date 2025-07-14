import styled, { keyframes } from 'styled-components';

// ===================================================================
// SHARED ANIMATIONS
// ===================================================================

export const fadeIn = keyframes`
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
`;

export const slideUp = keyframes`
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

export const float = keyframes`
    0%, 100% {
        transform: translateY(0px);
    }
    50% {
        transform: translateY(-10px);
    }
`;

// ===================================================================
// SHARED STYLED COMPONENTS
// ===================================================================

// Glass morphism background
export const GlassBackground = styled.div`
    min-height: 100vh;
    background: ${({ theme }) => theme.colors.gradientAnalysis ||
        `linear-gradient(135deg, 
            ${theme.colors.primary}08 0%,
            ${theme.colors.secondary}05 25%,
            ${theme.colors.accent}08 50%,
            ${theme.colors.primary}05 75%,
            ${theme.colors.secondary}08 100%
        )`
    };
    position: relative;
    overflow: hidden;
    
    /* Animated background elements */
    &::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle at 30% 20%, 
            ${({ theme }) => theme.colors.primary}15 0%, 
            transparent 50%
        ),
        radial-gradient(circle at 70% 80%, 
            ${({ theme }) => theme.colors.accent}10 0%, 
            transparent 50%
        ),
        radial-gradient(circle at 20% 80%, 
            ${({ theme }) => theme.colors.secondary}12 0%, 
            transparent 50%
        );
        animation: ${float} 20s ease-in-out infinite;
        pointer-events: none;
    }
`;

// Glass morphism card
export const GlassCard = styled.div`
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 24px;
    position: relative;
    overflow: hidden;
    animation: ${slideUp} 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    
    /* Glass morphism overlay */
    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.1) 0%, 
            transparent 50%,
            rgba(255, 255, 255, 0.05) 100%
        );
        pointer-events: none;
        border-radius: 24px;
    }
    
    /* Subtle top highlight */
    &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, 
            transparent, 
            rgba(255, 255, 255, 0.3), 
            transparent
        );
        border-radius: 24px 24px 0 0;
    }
    
    box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.12),
        0 2px 8px rgba(0, 0, 0, 0.08),
        0 0 0 1px rgba(255, 255, 255, 0.05) inset;
`;

// App icon with gradient
export const AppIcon = styled.div`
    width: ${({ size = 64 }) => size}px;
    height: ${({ size = 64 }) => size}px;
    margin: 0 auto 24px;
    background: linear-gradient(135deg, 
        ${({ theme }) => theme.colors.primary} 0%,
        ${({ theme }) => theme.colors.secondary} 50%,
        ${({ theme }) => theme.colors.accent} 100%
    );
    border-radius: ${({ size = 64 }) => Math.round(size * 0.3125)}px; /* 20px for 64px */
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${({ size = 64 }) => Math.round(size * 0.4375)}px; /* 28px for 64px */
    color: white;
    font-weight: 800;
    box-shadow: 
        0 8px 24px rgba(139, 92, 246, 0.3),
        0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    animation: ${fadeIn} 1s ease 0.2s both;
    position: relative;
    z-index: 1;
    
    @media (max-width: 768px) {
        width: ${({ size = 64 }) => Math.round(size * 0.875)}px; /* 56px for 64px */
        height: ${({ size = 64 }) => Math.round(size * 0.875)}px;
        font-size: ${({ size = 64 }) => Math.round(size * 0.375)}px; /* 24px for 64px */
        border-radius: ${({ size = 64 }) => Math.round(size * 0.25)}px; /* 16px for 64px */
        margin-bottom: 20px;
    }
`;

// Modern title
export const ModernTitle = styled.h1`
    color: ${({ theme }) => theme.colors.text};
    font-size: ${({ size = 'large' }) => size === 'large' ? '32px' : '28px'};
    font-weight: 800;
    margin: 0 0 8px 0;
    letter-spacing: -0.02em;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    animation: ${fadeIn} 1s ease 0.4s both;
    text-align: center;
    position: relative;
    z-index: 1;
    
    @media (max-width: 768px) {
        font-size: ${({ size = 'large' }) => size === 'large' ? '28px' : '24px'};
    }
    
    @media (max-width: 480px) {
        font-size: ${({ size = 'large' }) => size === 'large' ? '24px' : '20px'};
    }
`;

// Modern subtitle
export const ModernSubtitle = styled.p`
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 16px;
    font-weight: 500;
    margin: 0;
    line-height: 1.5;
    animation: ${fadeIn} 1s ease 0.6s both;
    text-align: center;
    position: relative;
    z-index: 1;
    
    @media (max-width: 768px) {
        font-size: 15px;
    }
    
    @media (max-width: 480px) {
        font-size: 14px;
    }
`;

// Google button container with modern styling
export const GoogleButtonContainer = styled.div`
    display: flex;
    justify-content: center;
    width: 100%;
    animation: ${slideUp} 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    position: relative;
    z-index: 1;
    
    /* Style the Google button iframe */
    > div {
        width: 100% !important;
        max-width: 320px;
        
        iframe {
            border-radius: 16px !important;
            box-shadow: 
                0 4px 16px rgba(139, 92, 246, 0.1),
                0 2px 8px rgba(0, 0, 0, 0.05) !important;
            transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            
            &:hover {
                transform: translateY(-2px);
                box-shadow: 
                    0 8px 32px rgba(139, 92, 246, 0.15),
                    0 4px 16px rgba(59, 130, 246, 0.1) !important;
            }
            
            &:active {
                transform: translateY(-1px);
            }
        }
    }
    
    @media (max-width: 768px) {
        > div {
            max-width: 280px;
            
            iframe {
                border-radius: 14px !important;
            }
        }
    }
    
    @media (max-width: 480px) {
        > div {
            max-width: 100%;
            
            iframe {
                border-radius: 12px !important;
            }
        }
    }
`;

// Modern close button for modals
export const ModernCloseButton = styled.button`
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    color: ${({ theme }) => theme.colors.text};
    font-size: 18px;
    cursor: pointer;
    padding: 8px 12px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    z-index: 1;
    
    &:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: scale(1.05);
        color: ${({ theme }) => theme.colors.primary};
    }
    
    &:active {
        transform: scale(0.95);
    }
`;

// Modal overlay with backdrop blur
export const ModalOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    animation: ${fadeIn} 0.3s ease;
    padding: 20px;
`; 