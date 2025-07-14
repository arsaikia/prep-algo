import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
`;

export const Ring = styled.div`
    position: relative;
    width: ${props => props.size === 'large' ? '90px' : props.size === 'small' ? '50px' : '70px'};
    height: ${props => props.size === 'large' ? '90px' : props.size === 'small' ? '50px' : '70px'};
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    
    &::before {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: conic-gradient(
            from -90deg,
            rgba(255, 255, 255, 0.2) 0deg,
            rgba(255, 255, 255, 0.9) ${props => props.percentage * 3.6}deg,
            rgba(255, 255, 255, 0.15) ${props => props.percentage * 3.6}deg
        );
        mask: radial-gradient(circle, transparent 62%, black 62%);
        filter: drop-shadow(0 ${props => props.size === 'large' ? '4px 8px' : '2px 4px'} rgba(0, 0, 0, 0.2));
    }
    
    /* Subtle outer glow */
    &::after {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: radial-gradient(circle, 
            transparent 60%, 
            rgba(255, 255, 255, 0.1) 70%,
            transparent 80%
        );
        animation: ${pulse} 3s ease-in-out infinite;
    }
    
    &:hover {
        transform: scale(1.05);
        
        &::before {
            filter: drop-shadow(0 ${props => props.size === 'large' ? '6px 12px' : '3px 6px'} rgba(0, 0, 0, 0.3));
        }
    }
`;

export const Text = styled.div`
    text-align: center;
    z-index: 1;
`;

export const Percentage = styled.div`
    font-size: ${props => props.size === 'large' ? '20px' : props.size === 'small' ? '12px' : '16px'};
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.01em;
    text-shadow: 0 ${props => props.size === 'large' ? '2px 4px' : '1px 2px'} rgba(0, 0, 0, 0.3);
`;

export const Label = styled.div`
    font-size: ${props => props.size === 'large' ? '10px' : props.size === 'small' ? '7px' : '8px'};
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: ${props => props.size === 'small' ? '1px' : '2px'};
`; 