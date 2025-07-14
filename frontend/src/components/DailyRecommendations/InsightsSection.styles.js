import styled from 'styled-components';

export const Section = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    position: relative;
    z-index: 1;
    
    ${props => props.mobile && `
        flex-direction: column;
        gap: 16px;
    `}
`;

export const InsightGroup = styled.div`
    flex: 1;
    
    ${props => props.mobile && `
        text-align: center;
    `}
`;

export const Title = styled.h4`
    margin: 0 0 12px 0;
    font-size: ${props => props.mobile ? '12px' : '14px'};
    font-weight: 600;
    opacity: 0.9;
    display: flex;
    align-items: center;
    gap: 8px;
    
    ${props => props.mobile && `
        justify-content: center;
        margin-bottom: 8px;
    `}
`;

export const TagsList = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    
    ${props => props.mobile && `
        justify-content: center;
        gap: 4px;
    `}
`;

export const Tag = styled.span`
    position: relative;
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.9);
    padding: 6px 12px;
    border-radius: 16px;
    font-size: ${props => props.mobile ? '10px' : '12px'};
    font-weight: 600;
    backdrop-filter: blur(8px);
    transition: all 0.3s ease;
    cursor: default;
    overflow: hidden;
    
    ${props => props.mobile && `
        padding: 4px 8px;
        border-radius: 12px;
    `}
    
    /* Progress fill background */
    ${props => props.$progress && `
        &::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            width: ${props.$progress}%;
            background: ${(() => {
            const progress = props.$progress;
            if (progress <= 30) {
                return 'linear-gradient(90deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.1) 100%)';
            } else if (progress <= 70) {
                return 'linear-gradient(90deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.1) 100%)';
            } else {
                return 'linear-gradient(90deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.1) 100%)';
            }
        })()};
            transition: width 0.8s ease;
            z-index: 0;
        }
    `}
    
    /* Content positioning */
    span {
        position: relative;
        z-index: 1;
        display: block;
        transition: opacity 0.3s ease;
    }
    
    /* Hover state */
    &:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: translateY(-1px);
        
        ${props => props.$progress && `
            span {
                opacity: 0;
            }
            
            &::after {
                content: '${props.$progress}%';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: rgba(255, 255, 255, 0.95);
                font-weight: 700;
                font-size: ${props.mobile ? '11px' : '13px'};
                z-index: 2;
            }
        `}
    }
`;

export const BatchInfo = styled.div`
    text-align: ${props => props.mobile ? 'center' : 'right'};
    opacity: 0.8;
    
    ${props => props.mobile && `
        margin-top: 8px;
    `}
`;

export const BatchDate = styled.div`
    font-size: ${props => props.mobile ? '11px' : '13px'};
    margin-bottom: 4px;
    font-weight: 500;
`;

export const BatchStatus = styled.div`
    font-size: ${props => props.mobile ? '10px' : '12px'};
    opacity: 0.7;
`; 