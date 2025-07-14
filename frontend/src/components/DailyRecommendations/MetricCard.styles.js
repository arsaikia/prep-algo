import styled from 'styled-components';

export const Card = styled.div`
    display: flex;
    flex-direction: ${props => props.mobile ? 'row' : 'column'};
    gap: ${props => props.mobile ? '12px' : '10px'};
    transition: all 0.3s ease;
    align-items: ${props => props.mobile ? 'center' : 'flex-start'};
    
    /* Mobile styling */
    ${props => props.mobile && `
        padding: 12px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        text-align: left;
        min-height: auto;
    `}
    
    &:hover {
        transform: translateY(-2px);
    }
`;

export const Icon = styled.div`
    font-size: ${props => props.mobile ? '20px' : '28px'};
    opacity: 0.95;
    transition: all 0.3s ease;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
    flex-shrink: 0;
    
    ${props => props.mobile && `
        margin-bottom: 0;
    `}
    
    ${Card}:hover & {
        transform: scale(1.1);
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
    }
`;

export const Content = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.mobile ? '2px' : '4px'};
    flex: 1;
`;

export const Value = styled.div`
    font-size: ${props => props.mobile ? '18px' : '32px'};
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.01em;
    transition: all 0.3s ease;
    margin-bottom: ${props => props.mobile ? '2px' : '0'};
    
    &.level-beginner {
        color: ${({ theme }) => theme.colors.levelBeginner};
        text-shadow: 0 0 12px ${({ theme }) => theme.colors.levelBeginner}50;
    }
    
    &.level-intermediate {
        color: ${({ theme }) => theme.colors.levelIntermediate};
        text-shadow: 0 0 12px ${({ theme }) => theme.colors.levelIntermediate}50;
    }
    
    &.level-advanced {
        color: ${({ theme }) => theme.colors.levelAdvanced};
        text-shadow: 0 0 12px ${({ theme }) => theme.colors.levelAdvanced}50;
    }
    
    ${Card}:hover & {
        transform: scale(1.05);
    }
`;

export const Label = styled.div`
    font-size: ${props => props.mobile ? '10px' : '13px'};
    opacity: 0.85;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: ${props => props.mobile ? '1px' : '2px'};
`;

export const Subtext = styled.div`
    font-size: ${props => props.mobile ? '9px' : '11px'};
    opacity: 0.7;
`; 