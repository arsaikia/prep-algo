import styled, { keyframes, css } from 'styled-components';
import { sparkleFloat, sparkleGlow } from './animations';

// Subtle pulse animation to show chevron is clickable
export const pulseBackground = keyframes`
    0%, 100% {
        background: rgba(255, 255, 255, 0.0);
    }
    50% {
        background: rgba(255, 255, 255, 0.08);
    }
`;

export const MobileCard = styled.div`
    background: ${({ theme }) => theme.colors.gradientAnalysis};
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 20px;
    color: ${({ theme }) => theme.colors.white};
    position: relative;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    
    /* Enhanced layered shadow system */
    box-shadow: 
        0 1px 3px rgba(0, 0, 0, 0.05),
        0 8px 24px rgba(0, 0, 0, 0.15),
        0 20px 40px rgba(0, 0, 0, 0.1),
        0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    
    /* Hide on desktop */
    @media (min-width: 769px) {
        display: none;
    }
`;

export const Header = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
    text-align: center;
`;

export const Title = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export const SparkleIcon = styled.span`
    display: inline-block;
    font-size: 28px;
    animation: ${sparkleFloat} 4s ease-in-out infinite;
    transition: all 0.3s ease;
    cursor: pointer;
    
    &:hover {
        animation: ${sparkleFloat} 1s ease-in-out infinite, ${sparkleGlow} 2s ease-in-out infinite;
        transform: scale(1.15);
    }
`;

export const TitleMain = styled.h2`
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    letter-spacing: -0.02em;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

export const TitleSub = styled.p`
    margin: 0;
    font-size: 13px;
    opacity: 0.9;
    font-weight: 500;
    line-height: 1.5;
    letter-spacing: 0.01em;
    text-align: center;
`;

export const BrowseAllLink = styled.button`
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.85);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 18px;
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    backdrop-filter: blur(8px);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    align-self: center;
    
    &:hover {
        background: rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 1);
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    
    &:active {
        transform: translateY(-1px) scale(1.01);
    }
`;

export const QuickStats = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: ${props => props.$isExpanded ? '16px' : '0'};
    transition: margin-bottom 0.3s ease;
`;

export const QuickStatCard = styled.div`
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 12px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 80px;
`;

export const QuickMetricIcon = styled.div`
    font-size: 18px;
    margin-bottom: 4px;
`;

export const QuickMetricValue = styled.div`
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 2px;
    line-height: 1;
`;

export const QuickMetricLabel = styled.div`
    font-size: 10px;
    opacity: 0.85;
    text-transform: uppercase;
    letter-spacing: 0.3px;
`;

export const CollapsibleContent = styled.div`
    transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    overflow: hidden;
    
    ${props => props.$isCollapsed && css`
        max-height: 0;
        opacity: 0;
        margin-bottom: 0;
        transform: translateY(-10px);
    `}
    
    ${props => !props.$isCollapsed && css`
        max-height: 2000px;
        opacity: 1;
        margin-bottom: inherit;
        transform: translateY(0);
    `}
`;

export const MetricsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 20px;
    
    @media (max-width: 480px) {
        gap: 8px;
    }
`;

export const CollapseToggle = styled.button`
    display: flex;
    background: transparent;
    border: none;
    border-radius: 50%;
    color: rgba(255, 255, 255, 0.6);
    width: 24px;
    height: 24px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
    margin: 8px auto 0 auto;
    animation: ${pulseBackground} 2s ease-in-out 2;
    animation-delay: 1s;
    align-items: center;
    justify-content: center;
    
    &:hover {
        color: rgba(255, 255, 255, 0.9);
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-1px);
        animation: none;
    }
    
    &:active {
        transform: translateY(0);
        background: rgba(255, 255, 255, 0.15);
    }
`; 