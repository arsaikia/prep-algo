import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { CheckCircle } from 'react-feather';
import { getSmartDailyRecommendations, replaceCompletedQuestions } from '../../api/getSmartRecommendations';
import AnalyticsDashboard from './AnalyticsCard';

/*
MINIMALIST DESIGN APPROACH:
- Clean, uncluttered card layout
- Subtle reason text without heavy background
- Remove redundant information (priority tag removed, already in indicator)
- Strategy icon combined with tag in footer
- Prominent question names
- Green tint sufficient for completion status
*/

// Animations
const spin = keyframes`
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
`;

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

// Styled Components
const Container = styled.div`
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: ${({ theme }) => theme.colors.text};
    
    &.loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        color: ${({ theme }) => theme.colors.textSecondary};
    }
    
    &.error {
        text-align: center;
        padding: 40px;
        color: ${({ theme }) => theme.colors.statusError};
    }
`;

const LoadingSpinner = styled.div`
    width: 40px;
    height: 40px;
    border: 4px solid ${({ theme }) => theme.colors.border};
    border-top: 4px solid ${({ theme }) => theme.colors.primary};
    border-radius: 50%;
    animation: ${spin} 1s linear infinite;
    margin-bottom: 16px;
`;

const RetryButton = styled.button`
    background: ${({ theme }) => theme.colors.buttonPrimary};
    color: ${({ theme }) => theme.colors.white};
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    margin-top: 16px;
    transition: all 0.2s ease;
    
    &:hover {
        opacity: 0.9;
        transform: translateY(-1px);
    }
`;





const GetFreshQuestionsButton = styled.button`
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    background: ${props => props.disabled
        ? props.theme.colors.backgroundDisabled
        : `linear-gradient(135deg, ${props.theme.colors.primary} 0%, ${props.theme.colors.secondary} 100%)`
    };
    color: ${({ theme }) => theme.colors.white};
    font-weight: 700;
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
    transition: all 0.3s ease;
    opacity: ${props => props.disabled ? 0.6 : 1};
    font-size: 0.9rem;
    border: 2px solid transparent;
    position: relative;
    overflow: hidden;

    &:before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, 
            transparent, 
            rgba(255, 255, 255, 0.2), 
            transparent
        );
        transition: left 0.5s ease;
    }

    &:hover:not(:disabled) {
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 8px 25px ${({ theme }) => theme.colors.primary}40;
        border-color: ${({ theme }) => theme.colors.white}30;
        
        &:before {
            left: 100%;
        }
    }

    &:active:not(:disabled) {
        transform: translateY(-1px) scale(1.01);
    }
`;



const RecommendationsList = styled.div`
    display: grid;
    gap: 16px;
`;

const CompletedSectionDivider = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 24px 0 16px 0;
    opacity: 0.8;
`;

const CompletedSectionTitle = styled.h3`
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textSecondary};
    white-space: nowrap;
`;

const CompletedSectionLine = styled.div`
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, 
        ${({ theme }) => theme.colors.border}, 
        transparent
    );
`;

const RecommendationCard = styled.div`
    background: ${({ theme, $isCompleted }) =>
        $isCompleted
            ? theme.colors.difficultyEasy + '08'  // Very subtle green background tint (same as questions page)
            : theme.colors.background
    };
    border: 1px solid ${({ theme, $isCompleted }) =>
        $isCompleted
            ? theme.colors.difficultyEasy + '30'
            : theme.colors.border
    };
    border-radius: 16px;
    padding: 24px;
    cursor: ${({ $isCompleted }) => $isCompleted ? 'default' : 'pointer'};
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: ${({ theme, $isCompleted }) =>
        $isCompleted
            ? theme.colors.shadowCard
            : theme.colors.shadowCard
    };
    animation: ${slideUp} 0.5s ease-out;
    animation-delay: ${({ index }) => index * 0.1}s;
    animation-fill-mode: both;
    position: relative;
    overflow: hidden;
    
    /* Subtle left border accent based on priority */
    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background: ${({ theme, $isCompleted, priority }) => {
        if ($isCompleted) return theme.colors.difficultyEasy;
        switch (priority) {
            case 'high': return theme.colors.priorityHigh;
            case 'medium': return theme.colors.priorityMedium;
            case 'low': return theme.colors.priorityLow;
            default: return theme.colors.primary;
        }
    }};
        border-radius: 0 2px 2px 0;
    }
    
    &:hover {
        border-color: ${({ theme, $isCompleted }) =>
        $isCompleted
            ? theme.colors.difficultyEasy
            : theme.colors.primary
    };
        box-shadow: ${({ theme, $isCompleted }) =>
        $isCompleted
            ? `0 8px 30px ${theme.colors.difficultyEasy}20`
            : theme.colors.shadowRecommendationHover
    };
        transform: translateY(-3px);
    }
`;

const RecommendationHeader = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 16px;
`;

const PriorityIndicator = styled.div`
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    flex-shrink: 0;
    margin-top: 0;
    position: relative;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
    
    // Completed questions get green styling (like questions page)
    ${({ $isCompleted, theme }) => $isCompleted ? `
        background: linear-gradient(135deg, ${theme.colors.difficultyEasy}, ${theme.colors.difficultyEasy}dd);
        color: ${theme.colors.white};
        border: 2px solid ${theme.colors.difficultyEasy};
        font-size: 16px;
        box-shadow: 0 4px 12px ${theme.colors.difficultyEasy}30;
    ` : `
        color: ${theme.colors.white};
        
        &.priority-high {
            background: linear-gradient(135deg, ${theme.colors.priorityHigh}, ${theme.colors.priorityHigh}dd);
            box-shadow: 0 4px 12px ${theme.colors.priorityHigh}30;
        }
        
        &.priority-medium {
            background: linear-gradient(135deg, ${theme.colors.priorityMedium}, ${theme.colors.priorityMedium}dd);
            box-shadow: 0 4px 12px ${theme.colors.priorityMedium}30;
        }
        
        &.priority-low {
            background: linear-gradient(135deg, ${theme.colors.priorityLow}, ${theme.colors.priorityLow}dd);
            box-shadow: 0 4px 12px ${theme.colors.priorityLow}30;
        }
    `}
    
    &:hover {
        transform: scale(1.05);
    }
`;

const StrategyIcon = styled.div`
    font-size: 24px;
    flex-shrink: 0;
`;

const QuestionInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const QuestionName = styled.h4`
    margin: 0 0 2px 0;
    font-size: 20px;
    font-weight: 700;
    color: ${({ theme, $isCompleted }) =>
        $isCompleted
            ? theme.colors.text
            : theme.colors.text
    };
    line-height: 1.3;
`;

const QuestionMeta = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 6px;
`;

const CompletedIndicator = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    color: ${({ theme }) => theme.colors.difficultyEasy};
    font-size: 12px;
    font-weight: 600;
    background: ${({ theme }) => theme.colors.difficultyEasy}15;
    padding: 4px 8px;
    border-radius: 12px;
    border: 1px solid ${({ theme }) => theme.colors.difficultyEasy}30;
`;

const QuestionGroup = styled.span`
    background: ${({ theme }) => theme.colors.backgroundTertiary};
    color: ${({ theme }) => theme.colors.textSecondary};
    border: 1px solid ${({ theme }) => theme.colors.border};
    padding: 4px 10px;
    border-radius: 14px;
    font-size: 11px;
    font-weight: 500;
    opacity: 0.9;
    transition: all 0.2s ease;
    
    &:hover {
        background: ${({ theme }) => theme.colors.backgroundHover};
        transform: translateY(-1px);
    }
`;

const QuestionDifficulty = styled.span`
    font-weight: 600;
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 14px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: all 0.2s ease;
    
    &.difficulty-easy {
        color: ${({ theme }) => theme.colors.difficultyEasy};
        background: ${({ theme }) => theme.colors.difficultyEasy}15;
        border: 1px solid ${({ theme }) => theme.colors.difficultyEasy}30;
    }
    
    &.difficulty-medium {
        color: ${({ theme }) => theme.colors.difficultyMedium};
        background: ${({ theme }) => theme.colors.difficultyMedium}15;
        border: 1px solid ${({ theme }) => theme.colors.difficultyMedium}30;
    }
    
    &.difficulty-hard {
        color: ${({ theme }) => theme.colors.difficultyHard};
        background: ${({ theme }) => theme.colors.difficultyHard}15;
        border: 1px solid ${({ theme }) => theme.colors.difficultyHard}30;
    }
    
    &.difficulty-unknown {
        color: ${({ theme }) => theme.colors.difficultyUnknown};
        background: ${({ theme }) => theme.colors.difficultyUnknown}15;
        border: 1px solid ${({ theme }) => theme.colors.difficultyUnknown}30;
    }
    
    &:hover {
        transform: translateY(-1px);
        filter: brightness(1.1);
    }
`;

const RecommendationReason = styled.div`
    margin: 12px 0 0 0;
    padding: 0;
    background: transparent;
    border-radius: 0;
    border-left: none;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
`;

const ReasonContent = styled.div`
    flex: 1;
    min-width: 0;
`;

const ReasonText = styled.span`
    color: ${({ theme }) => theme.colors.textTertiary};
    font-size: 13px;
    line-height: 1.4;
    display: block;
    margin-bottom: 4px;
    font-style: italic;
    opacity: 0.85;
`;

const LastSolved = styled.span`
    color: ${({ theme }) => theme.colors.textTertiary};
    font-size: 12px;
    font-style: italic;
`;



const InlineStrategyTag = styled.div`
    flex-shrink: 0;
    align-self: flex-start;
`;

const StrategyTag = styled.span`
    color: ${({ theme }) => theme.colors.white};
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 600;
    text-transform: capitalize;
    text-shadow: ${({ theme }) => theme.colors.strategyTagTextShadow};
    border: ${({ theme }) => theme.colors.strategyTagBorder};
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s ease;
    cursor: default;
    background: ${({ theme, strategy }) => {
        switch (strategy) {
            case 'weak_area_reinforcement': return theme.colors.strategyWeakArea;
            case 'progressive_difficulty': return theme.colors.strategyProgressive;
            case 'spaced_repetition': return theme.colors.strategySpaced;
            case 'topic_exploration': return theme.colors.strategyExploration;
            case 'general_practice': return theme.colors.strategyGeneral;
            default: return theme.colors.strategyGeneral;
        }
    }};
    
    &:hover {
        transform: scale(1.05);
        filter: brightness(1.1);
    }
`;

const PriorityTag = styled.span`
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 600;
    text-transform: capitalize;
    border: 1px solid;
    
    &.priority-high {
        background: ${({ theme }) => theme.colors.priorityHighBg};
        color: ${({ theme }) => theme.colors.priorityHigh};
        border-color: ${({ theme }) => theme.colors.priorityHigh};
    }
    
    &.priority-medium {
        background: ${({ theme }) => theme.colors.priorityMediumBg};
        color: ${({ theme }) => theme.colors.priorityMedium};
        border-color: ${({ theme }) => theme.colors.priorityMedium};
    }
    
    &.priority-low {
        background: ${({ theme }) => theme.colors.priorityLowBg};
        color: ${({ theme }) => theme.colors.priorityLow};
        border-color: ${({ theme }) => theme.colors.priorityLow};
    }
`;

const NoRecommendations = styled.div`
    text-align: center;
    padding: 60px 20px;
    color: ${({ theme }) => theme.colors.textSecondary};
    
    h3 {
        color: ${({ theme }) => theme.colors.statusSuccess};
        margin-bottom: 12px;
    }
`;



// Mobile responsive styles
const MobileContainer = styled.div`
    @media (max-width: 768px) {
        ${Container} {
            padding: 16px;
        }
        
        ${RecommendationCard} {
            padding: 20px;
            border-radius: 14px;
        }
        
        ${RecommendationHeader} {
            gap: 12px;
            margin-bottom: 12px;
        }
        
        ${PriorityIndicator} {
            width: 32px;
            height: 32px;
            font-size: 12px;
        }
        
        ${QuestionName} {
            font-size: 18px;
            line-height: 1.25;
        }
        
        ${QuestionMeta} {
            gap: 6px;
            margin-top: 4px;
        }
        
        ${RecommendationReason} {
            margin: 10px 0 0 0;
            flex-direction: column;
            gap: 12px;
        }
        
        ${InlineStrategyTag} {
            align-self: flex-start;
        }
    }
`;

const DailyRecommendations = ({ userId, onQuestionSelect }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [progress, setProgress] = useState(null);
    const [batchInfo, setBatchInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [replacingCompleted, setReplacingCompleted] = useState(false);

    useEffect(() => {
        if (userId) {
            fetchRecommendations();
        }
    }, [userId]);

    const fetchRecommendations = async () => {
        try {
            setLoading(true);

            // Use Smart Hybrid recommendations (no fallback needed - this is our primary system)
            const data = await getSmartDailyRecommendations(userId, {
                count: 5,
                forceRefresh: false
            });

            setRecommendations(data.recommendations || []);
            setAnalysis(data.analysis || null);
            setProgress(data.progress || null);
            setBatchInfo(data.batchInfo || null);

            // Handle legacy format for new users
            if (!data.analysis && data.strategy) {
                setAnalysis({
                    userLevel: data.strategy,
                    totalSolved: 0,
                    recentActivity: 0,
                    weakAreas: [],
                    strongAreas: []
                });
            }

            setError(null);
        } catch (err) {
            console.error('Error fetching recommendations:', err);
            setError('Failed to fetch recommendations');
        } finally {
            setLoading(false);
        }
    };





    const canReplaceCompleted = () => {
        return batchInfo?.canReplaceCompleted || false;
    };

    const handleReplaceCompleted = async () => {
        if (!userId || replacingCompleted) return;

        setReplacingCompleted(true);
        try {
            const data = await replaceCompletedQuestions(userId);
            setRecommendations(data.recommendations);
            setAnalysis(data.analysis);
            setProgress(data.progress);
            setBatchInfo(data.batchInfo);
            setError(null);
        } catch (err) {
            console.error('Error replacing completed questions:', err);
            setError(err.message || 'Failed to replace completed questions');
        } finally {
            setReplacingCompleted(false);
        }
    };

    const getStrategyIcon = (strategy) => {
        switch (strategy) {
            case 'weak_area_reinforcement': return '💪';
            case 'progressive_difficulty': return '📈';
            case 'spaced_repetition': return '🔄';
            case 'topic_exploration': return '🗺️';
            case 'general_practice': return '⭐';
            default: return '📚';
        }
    };

    if (loading) {
        return (
            <Container className="loading">
                <LoadingSpinner />
                <p>Generating your personalized recommendations...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="error">
                <h3>⚠️ Error</h3>
                <p>{error}</p>
                <RetryButton onClick={fetchRecommendations}>
                    Try Again
                </RetryButton>
            </Container>
        );
    }

    return (
        <MobileContainer>
            <Container>
                {/* Analytics Dashboard */}
                <AnalyticsDashboard
                    analysis={analysis}
                    progress={progress}
                    batchInfo={batchInfo}
                />

                <RecommendationsList>
                    {recommendations.length === 0 ? (
                        <NoRecommendations>
                            <h3>🎉 Great job!</h3>
                            <p>You've solved all available questions in your current categories. Try exploring new topics!</p>
                        </NoRecommendations>
                    ) : (
                        (() => {
                            // Sort recommendations: incomplete first, then completed at bottom
                            const sortedRecommendations = [...recommendations].sort((a, b) => {
                                if (a.completed && !b.completed) return 1;
                                if (!a.completed && b.completed) return -1;
                                return 0;
                            });

                            const activeQuestions = sortedRecommendations.filter(rec => !rec.completed);
                            const completedQuestions = sortedRecommendations.filter(rec => rec.completed);

                            return (
                                <>
                                    {/* Active Questions */}
                                    {activeQuestions.map((rec, index) => {
                                        // Safety check for undefined recommendations
                                        if (!rec || !rec.question) {
                                            return null;
                                        }

                                        return (
                                            <RecommendationCard
                                                key={rec.question._id}
                                                index={index}
                                                $isCompleted={false}
                                                priority={rec.priority}
                                                data-completed={false}
                                                onClick={() => onQuestionSelect && onQuestionSelect(rec.question)}
                                            >
                                                <RecommendationHeader>
                                                    <PriorityIndicator
                                                        className={`priority-${rec.priority}`}
                                                        $isCompleted={false}
                                                    >
                                                        {index + 1}
                                                    </PriorityIndicator>

                                                    <QuestionInfo>
                                                        <QuestionName $isCompleted={false}>
                                                            {rec.question.name}
                                                        </QuestionName>
                                                        <QuestionMeta>
                                                            <QuestionGroup>
                                                                {rec.question.group}
                                                            </QuestionGroup>
                                                            <QuestionDifficulty
                                                                className={`difficulty-${rec.question.difficulty?.toLowerCase()}`}
                                                            >
                                                                {rec.question.difficulty}
                                                            </QuestionDifficulty>
                                                        </QuestionMeta>
                                                    </QuestionInfo>
                                                </RecommendationHeader>

                                                <RecommendationReason>
                                                    <ReasonContent>
                                                        <ReasonText>{rec.reason}</ReasonText>
                                                        {rec.lastSolved && (
                                                            <LastSolved>
                                                                Last solved: {new Date(rec.lastSolved).toLocaleDateString()}
                                                            </LastSolved>
                                                        )}
                                                    </ReasonContent>
                                                    <InlineStrategyTag>
                                                        <StrategyTag strategy={rec.strategy}>
                                                            {getStrategyIcon(rec.strategy)} {rec.strategy ? rec.strategy.replace(/_/g, ' ') : 'general practice'}
                                                        </StrategyTag>
                                                    </InlineStrategyTag>
                                                </RecommendationReason>
                                            </RecommendationCard>
                                        );
                                    })}

                                    {/* Completed Questions Section */}
                                    {completedQuestions.length > 0 && (
                                        <>
                                            <CompletedSectionDivider>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                    <CompletedSectionTitle>
                                                        ✅ Completed Questions ({completedQuestions.length})
                                                    </CompletedSectionTitle>
                                                    {canReplaceCompleted() && (
                                                        <GetFreshQuestionsButton
                                                            onClick={handleReplaceCompleted}
                                                            disabled={replacingCompleted}
                                                        >
                                                            {replacingCompleted ? '🔄 Getting Fresh...' : '✨ Get Fresh Questions'}
                                                        </GetFreshQuestionsButton>
                                                    )}
                                                </div>
                                                <CompletedSectionLine />
                                            </CompletedSectionDivider>

                                            {completedQuestions.map((rec, index) => {
                                                // Safety check for undefined recommendations
                                                if (!rec || !rec.question) {
                                                    return null;
                                                }

                                                const isCompleted = rec.completed || false;

                                                return (
                                                    <RecommendationCard
                                                        key={rec.question._id}
                                                        index={index}
                                                        $isCompleted={isCompleted}
                                                        priority={rec.priority}
                                                        data-completed={isCompleted}
                                                        onClick={() => !isCompleted && onQuestionSelect && onQuestionSelect(rec.question)}
                                                    >
                                                        <RecommendationHeader>
                                                            <PriorityIndicator
                                                                className={`priority-${rec.priority}`}
                                                                $isCompleted={isCompleted}
                                                            >
                                                                {isCompleted ? '✓' : index + 1}
                                                            </PriorityIndicator>

                                                            <QuestionInfo>
                                                                <QuestionName $isCompleted={isCompleted}>
                                                                    {rec.question.name}
                                                                </QuestionName>
                                                                <QuestionMeta>
                                                                    <QuestionGroup>
                                                                        {rec.question.group}
                                                                    </QuestionGroup>
                                                                    <QuestionDifficulty
                                                                        className={`difficulty-${rec.question.difficulty?.toLowerCase()}`}
                                                                    >
                                                                        {rec.question.difficulty}
                                                                    </QuestionDifficulty>

                                                                </QuestionMeta>
                                                            </QuestionInfo>
                                                        </RecommendationHeader>

                                                        <RecommendationReason>
                                                            <ReasonContent>
                                                                <ReasonText>{rec.reason}</ReasonText>
                                                                {rec.lastSolved && (
                                                                    <LastSolved>
                                                                        ✅ Completed: {new Date(rec.lastSolved).toLocaleDateString()}
                                                                    </LastSolved>
                                                                )}
                                                            </ReasonContent>
                                                            <InlineStrategyTag>
                                                                <StrategyTag strategy={rec.strategy}>
                                                                    {getStrategyIcon(rec.strategy)} {rec.strategy ? rec.strategy.replace(/_/g, ' ') : 'general practice'}
                                                                </StrategyTag>
                                                            </InlineStrategyTag>
                                                        </RecommendationReason>
                                                    </RecommendationCard>
                                                );
                                            })}
                                        </>
                                    )}
                                </>
                            );
                        })()
                    )}
                </RecommendationsList>
            </Container>
        </MobileContainer>
    );
};

export default DailyRecommendations;