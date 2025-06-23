import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useNavigate } from 'react-router-dom';

// Animations
const slideUp = keyframes`
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

const sparkleFloat = keyframes`
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

const sparkleGlow = keyframes`
    0%, 100% { 
        text-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
    }
    50% { 
        text-shadow: 0 0 16px rgba(255, 255, 255, 0.8), 0 0 24px rgba(255, 255, 255, 0.4);
    }
`;



// Premium Analytics Dashboard Card
const AnalyticsCard = styled.div`
    background: ${({ theme }) => theme.colors.gradientAnalysis};
    border-radius: 24px;
    padding: 40px;
    margin-bottom: 36px;
    color: ${({ theme }) => theme.colors.white};
    animation: ${slideUp} 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
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
`;

const AnalyticsHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 36px;
    position: relative;
    z-index: 1;
`;

const AnalyticsTitle = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const SparkleIcon = styled.span`
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

const AnalyticsTitleMain = styled.h2`
    margin: 0;
    font-size: 28px;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 14px;
    letter-spacing: -0.02em;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

const AnalyticsTitleSub = styled.p`
    margin: 0;
    font-size: 15px;
    opacity: 0.9;
    font-weight: 500;
    line-height: 1.5;
    letter-spacing: 0.01em;
`;

const TodayProgressRing = styled.div`
    position: relative;
    width: 90px;
    height: 90px;
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
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
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
        animation: pulse 3s ease-in-out infinite;
    }
    
    &:hover {
        transform: scale(1.05);
        
        &::before {
            filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.3));
        }
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
    }
`;

const ProgressRingText = styled.div`
    text-align: center;
    z-index: 1;
`;

const ProgressPercentage = styled.div`
    font-size: 20px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.01em;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const ProgressLabel = styled.div`
    font-size: 10px;
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const AnalyticsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 32px;
    margin-bottom: 36px;
    position: relative;
    z-index: 1;
`;

const AnalyticsMetric = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: all 0.3s ease;
    
    &:hover {
        transform: translateY(-2px);
    }
`;

const MetricIcon = styled.div`
    font-size: 28px;
    opacity: 0.95;
    transition: all 0.3s ease;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
    
    ${AnalyticsMetric}:hover & {
        transform: scale(1.1);
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
    }
`;

const MetricValue = styled.div`
    font-size: 32px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.01em;
    transition: all 0.3s ease;
    
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
    
    ${AnalyticsMetric}:hover & {
        transform: scale(1.05);
    }
`;

const MetricLabel = styled.div`
    font-size: 13px;
    opacity: 0.85;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const MetricSubtext = styled.div`
    font-size: 11px;
    opacity: 0.7;
    margin-top: 2px;
`;

const InsightsSection = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    position: relative;
    z-index: 1;
`;

const WeakAreasInsight = styled.div`
    flex: 1;
`;

const InsightTitle = styled.h4`
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    opacity: 0.9;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const WeakAreasList = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const WeakAreaTag = styled.span`
    position: relative;
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.9);
    padding: 6px 12px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 600;
    backdrop-filter: blur(8px);
    transition: all 0.3s ease;
    cursor: default;
    overflow: hidden;
        
    /* Progress fill background - using theme colors */
    ${props => props.$progress && css`
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
                // Red for low progress (focus areas) - using theme error color
                return `linear-gradient(90deg, ${props.theme.colors.error}30 0%, ${props.theme.colors.error}10 100%)`;
            } else if (progress <= 70) {
                // Blue for medium progress - using theme info color
                return `linear-gradient(90deg, ${props.theme.colors.info}30 0%, ${props.theme.colors.info}10 100%)`;
            } else {
                // Green for high progress - using theme success color
                return `linear-gradient(90deg, ${props.theme.colors.success}30 0%, ${props.theme.colors.success}10 100%)`;
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
        
        /* Show percentage on hover for progress items */
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
                font-size: 13px;
                z-index: 2;
            }
        `}
    }
`;

const BatchInfo = styled.div`
    text-align: right;
    opacity: 0.8;
`;

const BatchDate = styled.div`
    font-size: 13px;
    margin-bottom: 4px;
    font-weight: 500;
`;

const BatchStatus = styled.div`
    font-size: 12px;
    opacity: 0.7;
`;

const BrowseAllLink = styled.button`
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

// Mobile responsive styles
const MobileWrapper = styled.div`
    @media (max-width: 768px) {
        ${AnalyticsCard} {
            padding: 24px;
            border-radius: 16px;
            margin-bottom: 24px;
        }
        
        ${AnalyticsHeader} {
            flex-direction: column;
            gap: 20px;
            margin-bottom: 24px;
        }
        
        ${AnalyticsTitleMain} {
            font-size: 20px;
        }
        
        ${AnalyticsTitleSub} {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        ${BrowseAllLink} {
            margin-left: 0;
            align-self: flex-start;
        }
        
        ${TodayProgressRing} {
            width: 60px;
            height: 60px;
            align-self: center;
        }
        
        ${ProgressPercentage} {
            font-size: 14px;
        }
        
        ${AnalyticsGrid} {
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
        }
        
        ${AnalyticsMetric} {
            flex-direction: row;
            align-items: center;
            gap: 16px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
        }
        
        ${MetricIcon} {
            font-size: 32px;
        }
        
        ${MetricValue} {
            font-size: 24px;
        }
        
        ${InsightsSection} {
            flex-direction: column;
            gap: 16px;
        }
        
        ${BatchInfo} {
            text-align: left;
        }
    }
`;

const AnalyticsDashboard = ({ analysis, progress, batchInfo }) => {
    const navigate = useNavigate();

    if (!analysis && !progress) {
        return null;
    }

    // Extract streak and mastery info from enhanced analytics
    const streakInfo = analysis?.streakInfo || { currentStreak: 0, longestStreak: 0 };
    const topicMastery = analysis?.topicMastery || [];
    const masteredTopics = topicMastery.filter(topic => topic.level === 'mastered').length;

    return (
        <MobileWrapper>
            <AnalyticsCard>
                <AnalyticsHeader>
                    <AnalyticsTitle>
                        <AnalyticsTitleMain>
                            <SparkleIcon>✨</SparkleIcon> Learning Analytics
                        </AnalyticsTitleMain>
                        <AnalyticsTitleSub>
                            Your personalized learning insights and today's progress
                            <BrowseAllLink onClick={() => navigate('/all')}>
                                📚 Browse All Questions
                            </BrowseAllLink>
                        </AnalyticsTitleSub>
                    </AnalyticsTitle>

                    {progress && (
                        <TodayProgressRing percentage={(progress.completed / progress.total) * 100}>
                            <ProgressRingText>
                                <ProgressPercentage>
                                    {Math.round((progress.completed / progress.total) * 100)}%
                                </ProgressPercentage>
                                <ProgressLabel>Today</ProgressLabel>
                            </ProgressRingText>
                        </TodayProgressRing>
                    )}
                </AnalyticsHeader>

                {analysis && (
                    <AnalyticsGrid>
                        <AnalyticsMetric>
                            <MetricIcon>🎯</MetricIcon>
                            <MetricValue className={`level-${analysis.userLevel}`}>
                                {analysis.userLevel.toUpperCase()}
                            </MetricValue>
                            <MetricLabel>Skill Level</MetricLabel>
                            <MetricSubtext>Current proficiency</MetricSubtext>
                        </AnalyticsMetric>

                        <AnalyticsMetric>
                            <MetricIcon>✅</MetricIcon>
                            <MetricValue>{analysis.totalSolved}</MetricValue>
                            <MetricLabel>Total Solved</MetricLabel>
                            <MetricSubtext>All time progress</MetricSubtext>
                        </AnalyticsMetric>

                        <AnalyticsMetric>
                            <MetricIcon>🔥</MetricIcon>
                            <MetricValue>{streakInfo.currentStreak}</MetricValue>
                            <MetricLabel>Current Streak</MetricLabel>
                            <MetricSubtext>
                                {streakInfo.currentStreak === 0 ? 'Start today!' : 'Keep it going!'}
                            </MetricSubtext>
                        </AnalyticsMetric>

                        <AnalyticsMetric>
                            <MetricIcon>⭐</MetricIcon>
                            <MetricValue>{masteredTopics}</MetricValue>
                            <MetricLabel>Topics Mastered</MetricLabel>
                            <MetricSubtext>Complete understanding</MetricSubtext>
                        </AnalyticsMetric>
                    </AnalyticsGrid>
                )}

                <InsightsSection>
                    {/* Focus Areas */}
                    {analysis?.weakAreas && analysis.weakAreas.length > 0 && (
                        <WeakAreasInsight>
                            <InsightTitle>
                                💪 Focus Areas
                            </InsightTitle>
                            <WeakAreasList>
                                {analysis.weakAreas.slice(0, 4).map((area, index) => (
                                    <WeakAreaTag key={index}>
                                        <span>{area}</span>
                                    </WeakAreaTag>
                                ))}
                            </WeakAreasList>
                        </WeakAreasInsight>
                    )}

                    {/* Learning Progress */}
                    {topicMastery.length > 0 && (
                        <WeakAreasInsight>
                            <InsightTitle>
                                🎯 Learning Progress
                            </InsightTitle>
                            <WeakAreasList>
                                {topicMastery
                                    .filter(topic => topic.progress && topic.progress.percentage > 0)
                                    .slice(0, 3)
                                    .map((topic, index) => (
                                        <WeakAreaTag
                                            key={`topic-${index}`}
                                            $progress={topic.progress.percentage}
                                        >
                                            <span>{topic.topic}</span>
                                        </WeakAreaTag>
                                    ))}
                            </WeakAreasList>
                        </WeakAreasInsight>
                    )}

                    {batchInfo && (
                        <BatchInfo>
                            <BatchDate>
                                📅 {batchInfo.generatedAt ? new Date(batchInfo.generatedAt).toLocaleDateString() : 'Today'}
                            </BatchDate>
                            <BatchStatus>
                                {progress ? `${progress.completed}/${progress.total} completed` : 'Daily batch'}
                            </BatchStatus>
                            {streakInfo.longestStreak > 0 && (
                                <BatchStatus style={{ marginTop: '4px' }}>
                                    🏆 Best streak: {streakInfo.longestStreak} days
                                </BatchStatus>
                            )}
                        </BatchInfo>
                    )}
                </InsightsSection>
            </AnalyticsCard>
        </MobileWrapper>
    );
};

export default AnalyticsDashboard; 