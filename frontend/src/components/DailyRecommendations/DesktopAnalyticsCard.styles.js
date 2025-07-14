import styled from 'styled-components';
import { sparkleFloat, sparkleGlow } from './animations';

export const DesktopCard = styled.div`
    background: ${({ theme }) => theme.colors.gradientAnalysis};
    border-radius: 24px;
    padding: 40px;
    margin-bottom: 36px;
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
    
    /* Subtle glass morphism overlay */
    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.15) 0%, 
            rgba(255, 255, 255, 0.05) 30%,
            transparent 70%
        );
        pointer-events: none;
        border-radius: 24px;
    }
    
    /* Elegant top highlight */
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
    
    /* Subtle hover effect */
    &:hover {
        transform: translateY(-2px);
        box-shadow: 
            0 2px 6px rgba(0, 0, 0, 0.08),
            0 12px 32px rgba(0, 0, 0, 0.18),
            0 24px 48px rgba(0, 0, 0, 0.12),
            0 0 0 1px rgba(255, 255, 255, 0.08) inset;
    }
    
    /* Hide on mobile */
    @media (max-width: 768px) {
        display: none;
    }
`;

export const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 36px;
    position: relative;
    z-index: 1;
`;

export const Title = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export const SparkleIcon = styled.span`
    display: inline-block;
    font-size: 34px;
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
    font-size: 28px;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 14px;
    letter-spacing: -0.02em;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

export const TitleSub = styled.p`
    margin: 0;
    font-size: 15px;
    opacity: 0.9;
    font-weight: 500;
    line-height: 1.5;
    letter-spacing: 0.01em;
`;

export const BrowseAllLink = styled.button`
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.85);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    padding: 8px 16px;
    margin-left: 12px;
    margin-top: 8px;
    border-radius: 18px;
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    backdrop-filter: blur(8px);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    position: relative;
    overflow: hidden;
    
    /* Subtle inner highlight */
    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(90deg, 
            transparent, 
            rgba(255, 255, 255, 0.3), 
            transparent
        );
        border-radius: 18px 18px 0 0;
    }
    
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

export const MetricsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
    gap: 32px;
    margin-bottom: 36px;
    position: relative;
    z-index: 1;
`; 