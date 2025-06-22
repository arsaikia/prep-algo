import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { getDailyRecommendations } from '../../api/getDailyRecommendations';

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
        color: ${({ theme }) => theme.colors.status.error};
    }
`;

const LoadingSpinner = styled.div`
    width: 40px;
    height: 40px;
    border: 4px solid ${({ theme }) => theme.colors.border};
    border-top: 4px solid ${({ theme }) => theme.colors.brand.primary};
    border-radius: 50%;
    animation: ${spin} 1s linear infinite;
    margin-bottom: 16px;
`;

const RetryButton = styled.button`
    background: ${({ theme }) => theme.colors.interactive.buttonPrimary};
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    margin-top: 16px;
    transition: all 0.2s ease;
    
    &:hover {
        background: ${({ theme }) => theme.colors.interactive.buttonPrimaryHover};
        transform: translateY(-1px);
    }
`;

const AnalysisSummary = styled.div`
    background: ${({ theme }) => theme.colors.recommendations.analysisGradient};
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
    color: ${({ theme }) => theme.colors.recommendations.analysisText};
    animation: ${slideUp} 0.5s ease-out;
`;

const UserStats = styled.div`
    display: flex;
    gap: 24px;
    margin-bottom: 16px;
    flex-wrap: wrap;
`;

const Stat = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const StatLabel = styled.span`
    font-size: 12px;
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const StatValue = styled.span`
    font-size: 18px;
    font-weight: 700;
    
    &.level-beginner {
        color: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.level.complementary.beginner;
            case 'analogous': return theme.colors.level.analogous.beginner;
            default: return theme.colors.level.beginner;
        }
    }};
    }
    
    &.level-intermediate {
        color: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.level.complementary.intermediate;
            case 'analogous': return theme.colors.level.analogous.intermediate;
            default: return theme.colors.level.intermediate;
        }
    }};
    }
    
    &.level-advanced {
        color: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.level.complementary.advanced;
            case 'analogous': return theme.colors.level.analogous.advanced;
            default: return theme.colors.level.advanced;
        }
    }};
    }
`;

const WeakAreas = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
`;

const WeakAreasLabel = styled.span`
    font-weight: 600;
    white-space: nowrap;
`;

const WeakAreasList = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const WeakAreaTag = styled.span`
    background: ${({ theme }) => theme.colors.backgroundTertiary};
    color: ${({ theme }) => theme.colors.text};
    border: 1px solid ${({ theme }) => theme.colors.border};
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    
    &:hover {
        background: ${({ theme }) => theme.colors.backgroundHover};
        border-color: ${({ theme }) => theme.colors.brand.primary};
        transform: scale(1.05);
    }
`;

const RecommendationsList = styled.div`
    display: grid;
    gap: 16px;
`;

const RecommendationCard = styled.div`
    background: ${({ theme }) => theme.colors.recommendations.cardBackground};
    border: 2px solid ${({ theme }) => theme.colors.recommendations.cardBorder};
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: ${({ theme }) => theme.colors.recommendations.cardShadow};
    animation: ${slideUp} 0.5s ease-out;
    animation-delay: ${({ index }) => index * 0.1}s;
    animation-fill-mode: both;
    
    &:hover {
        border-color: ${({ theme }) => theme.colors.recommendations.cardBorderHover};
        box-shadow: ${({ theme }) => theme.colors.recommendations.cardShadowHover};
        transform: translateY(-2px);
    }
`;

const RecommendationHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
`;

const PriorityIndicator = styled.div`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    color: white;
    flex-shrink: 0;
    
    &.priority-high {
        background: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.priority.high.complementary.bg;
            case 'triadic': return '#6bff94'; // Light green triadic
            default: return theme.colors.priority.high.bg;
        }
    }};
    }
    
    &.priority-medium {
        background: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.priority.medium.complementary.bg;
            case 'triadic': return '#9c12f3'; // Purple triadic
            default: return theme.colors.priority.medium.bg;
        }
    }};
    }
    
    &.priority-low {
        background: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.priority.low.complementary.bg;
            case 'triadic': return '#db3498'; // Pink triadic
            default: return theme.colors.priority.low.bg;
        }
    }};
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
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
    line-height: 1.3;
`;

const QuestionMeta = styled.div`
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
`;

const QuestionGroup = styled.span`
    background: ${({ theme }) => theme.colors.backgroundTertiary};
    color: ${({ theme }) => theme.colors.text};
    border: 1px solid ${({ theme }) => theme.colors.border};
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
`;

const QuestionDifficulty = styled.span`
    font-weight: 600;
    font-size: 14px;
    
    &.difficulty-easy {
        color: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.difficulty.complementary.easy;
            case 'triadic': return theme.colors.difficulty.triadic.easy;
            default: return theme.colors.difficulty.easy;
        }
    }};
    }
    
    &.difficulty-medium {
        color: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.difficulty.complementary.medium;
            case 'triadic': return theme.colors.difficulty.triadic.medium;
            default: return theme.colors.difficulty.medium;
        }
    }};
    }
    
    &.difficulty-hard {
        color: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.difficulty.complementary.hard;
            case 'triadic': return theme.colors.difficulty.triadic.hard;
            default: return theme.colors.difficulty.hard;
        }
    }};
    }
    
    &.difficulty-unknown {
        color: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.difficulty.complementary.unknown;
            case 'triadic': return theme.colors.difficulty.triadic.unknown;
            default: return theme.colors.difficulty.unknown;
        }
    }};
    }
`;

const RecommendationReason = styled.div`
    margin: 12px 0;
    padding: 12px;
    background: ${({ theme }) => theme.colors.backgroundSecondary};
    border-radius: 8px;
    border-left: 4px solid ${({ theme }) => theme.colors.brand.primary};
`;

const ReasonText = styled.span`
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 14px;
    line-height: 1.4;
    display: block;
    margin-bottom: 4px;
`;

const LastSolved = styled.span`
    color: ${({ theme }) => theme.colors.textTertiary};
    font-size: 12px;
    font-style: italic;
`;

const RecommendationFooter = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    flex-wrap: wrap;
    gap: 8px;
`;

const StrategyTag = styled.span`
    color: #ffffff;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 600;
    text-transform: capitalize;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: ${({ theme, strategy, $colorScheme }) => {
        const getStrategyColor = (strategy) => {
            switch (strategy) {
                case 'weak_area_reinforcement':
                    switch ($colorScheme) {
                        case 'complementary': return theme.colors.strategy.complementary.weakArea;
                        case 'triadic': return theme.colors.strategy.triadic.weakArea;
                        default: return theme.colors.strategy.weakArea;
                    }
                case 'progressive_difficulty':
                    switch ($colorScheme) {
                        case 'complementary': return theme.colors.strategy.complementary.progressive;
                        case 'triadic': return theme.colors.strategy.triadic.progressive;
                        default: return theme.colors.strategy.progressive;
                    }
                case 'spaced_repetition':
                    switch ($colorScheme) {
                        case 'complementary': return theme.colors.strategy.complementary.spaced;
                        case 'triadic': return theme.colors.strategy.triadic.spaced;
                        default: return theme.colors.strategy.spaced;
                    }
                case 'topic_exploration':
                    switch ($colorScheme) {
                        case 'complementary': return theme.colors.strategy.complementary.exploration;
                        case 'triadic': return theme.colors.strategy.triadic.exploration;
                        default: return theme.colors.strategy.exploration;
                    }
                case 'general_practice':
                    switch ($colorScheme) {
                        case 'complementary': return theme.colors.strategy.complementary.general;
                        case 'triadic': return theme.colors.strategy.triadic.general;
                        default: return theme.colors.strategy.general;
                    }
                default: return theme.colors.backgroundTertiary;
            }
        };
        return getStrategyColor(strategy);
    }};
`;

const PriorityTag = styled.span`
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 600;
    text-transform: capitalize;
    border: 1px solid;
    
    &.priority-high {
        background: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.priority.high.complementary.lightBg;
            default: return theme.colors.priority.high.lightBg;
        }
    }};
        color: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.priority.high.complementary.lightText;
            default: return theme.colors.priority.high.lightText;
        }
    }};
        border-color: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.priority.high.complementary.lightText;
            default: return theme.colors.priority.high.lightText;
        }
    }};
    }
    
    &.priority-medium {
        background: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.priority.medium.complementary.lightBg;
            default: return theme.colors.priority.medium.lightBg;
        }
    }};
        color: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.priority.medium.complementary.lightText;
            default: return theme.colors.priority.medium.lightText;
        }
    }};
        border-color: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.priority.medium.complementary.lightText;
            default: return theme.colors.priority.medium.lightText;
        }
    }};
    }
    
    &.priority-low {
        background: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.priority.low.complementary.lightBg;
            default: return theme.colors.priority.low.lightBg;
        }
    }};
        color: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.priority.low.complementary.lightText;
            default: return theme.colors.priority.low.lightText;
        }
    }};
        border-color: ${({ theme, $colorScheme }) => {
        switch ($colorScheme) {
            case 'complementary': return theme.colors.priority.low.complementary.lightText;
            default: return theme.colors.priority.low.lightText;
        }
    }};
    }
`;

const NoRecommendations = styled.div`
    text-align: center;
    padding: 60px 20px;
    color: ${({ theme }) => theme.colors.textSecondary};
    
    h3 {
        color: ${({ theme }) => theme.colors.status.success};
        margin-bottom: 12px;
    }
`;

const RecommendationsFooter = styled.div`
    margin-top: 32px;
    padding: 20px;
    background: ${({ theme }) => theme.colors.backgroundSecondary};
    border-radius: 12px;
    border-left: 4px solid ${({ theme }) => theme.colors.brand.accent};
`;

const RecommendationTip = styled.p`
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 14px;
    line-height: 1.5;
    
    strong {
        color: ${({ theme }) => theme.colors.brand.primary};
    }
`;

const FooterThemeSelector = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    
    label {
        font-size: 14px;
        font-weight: 600;
        color: ${({ theme }) => theme.colors.brand.primary};
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    select {
        padding: 6px 12px;
        border: 2px solid ${({ theme }) => theme.colors.border};
        border-radius: 6px;
        background: ${({ theme }) => theme.colors.background};
        color: ${({ theme }) => theme.colors.text};
        font-size: 14px;
        transition: border-color 0.2s ease;
        
        &:focus {
            outline: none;
            border-color: ${({ theme }) => theme.colors.brand.primary};
        }
    }
    
    @media (max-width: 768px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }
`;

// Mobile responsive styles
const MobileContainer = styled.div`
    @media (max-width: 768px) {
        ${Container} {
            padding: 16px;
        }
        
        ${UserStats} {
            flex-direction: column;
            gap: 12px;
        }
        
        ${RecommendationHeader} {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
        }
        
        ${QuestionName} {
            font-size: 16px;
        }
        
        ${RecommendationFooter} {
            flex-direction: column;
            align-items: flex-start;
        }
    }
`;

const DailyRecommendations = ({ userId, onQuestionSelect }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [colorScheme, setColorScheme] = useState('original'); // original, complementary, triadic

    useEffect(() => {
        if (userId) {
            fetchRecommendations();
        }
    }, [userId]);

    const fetchRecommendations = async () => {
        try {
            setLoading(true);
            const response = await getDailyRecommendations(userId, 5); // Always fetch 5 recommendations
            setRecommendations(response.data.recommendations || []);

            // Handle both analysis object (users with history) and strategy string (new users)
            if (response.data.analysis) {
                setAnalysis(response.data.analysis);
            } else if (response.data.strategy) {
                // Create a basic analysis object for new users
                setAnalysis({
                    userLevel: response.data.strategy,
                    totalSolved: 0,
                    recentActivity: 0,
                    weakAreas: [],
                    strongAreas: []
                });
            } else {
                setAnalysis(null);
            }

            setError(null);
        } catch (err) {
            setError('Failed to fetch recommendations');
        } finally {
            setLoading(false);
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
                {analysis && (
                    <AnalysisSummary>
                        <UserStats>
                            <Stat>
                                <StatLabel>Level:</StatLabel>
                                <StatValue className={`level-${analysis.userLevel}`} $colorScheme={colorScheme}>
                                    {analysis.userLevel.toUpperCase()}
                                </StatValue>
                            </Stat>
                            <Stat>
                                <StatLabel>Total Solved:</StatLabel>
                                <StatValue>{analysis.totalSolved}</StatValue>
                            </Stat>
                            <Stat>
                                <StatLabel>Recent Activity:</StatLabel>
                                <StatValue>{analysis.recentActivity} this week</StatValue>
                            </Stat>
                        </UserStats>

                        {analysis.weakAreas && analysis.weakAreas.length > 0 && (
                            <WeakAreas>
                                <WeakAreasLabel>💪 Focus Areas:</WeakAreasLabel>
                                <WeakAreasList>
                                    {analysis.weakAreas.map((area, index) => (
                                        <WeakAreaTag key={index}>
                                            {area}
                                        </WeakAreaTag>
                                    ))}
                                </WeakAreasList>
                            </WeakAreas>
                        )}
                    </AnalysisSummary>
                )}

                <RecommendationsList>
                    {recommendations.length === 0 ? (
                        <NoRecommendations>
                            <h3>🎉 Great job!</h3>
                            <p>You've solved all available questions in your current categories. Try exploring new topics!</p>
                        </NoRecommendations>
                    ) : (
                        recommendations.map((rec, index) => {
                            // Safety check for undefined recommendations
                            if (!rec || !rec.question) {
                                return null;
                            }

                            return (
                                <RecommendationCard
                                    key={rec.question._id}
                                    index={index}
                                    onClick={() => onQuestionSelect && onQuestionSelect(rec.question)}
                                >
                                    <RecommendationHeader>
                                        <PriorityIndicator className={`priority-${rec.priority}`} $colorScheme={colorScheme}>
                                            {index + 1}
                                        </PriorityIndicator>
                                        <StrategyIcon>
                                            {getStrategyIcon(rec.strategy)}
                                        </StrategyIcon>
                                        <QuestionInfo>
                                            <QuestionName>{rec.question.name}</QuestionName>
                                            <QuestionMeta>
                                                <QuestionGroup>{rec.question.group}</QuestionGroup>
                                                <QuestionDifficulty
                                                    className={`difficulty-${rec.question.difficulty?.toLowerCase()}`}
                                                    $colorScheme={colorScheme}
                                                >
                                                    {rec.question.difficulty}
                                                </QuestionDifficulty>
                                            </QuestionMeta>
                                        </QuestionInfo>
                                    </RecommendationHeader>

                                    <RecommendationReason>
                                        <ReasonText>{rec.reason}</ReasonText>
                                        {rec.lastSolved && (
                                            <LastSolved>
                                                Last solved: {new Date(rec.lastSolved).toLocaleDateString()}
                                            </LastSolved>
                                        )}
                                    </RecommendationReason>

                                    <RecommendationFooter>
                                        <StrategyTag strategy={rec.strategy} $colorScheme={colorScheme}>
                                            {rec.strategy ? rec.strategy.replace(/_/g, ' ') : 'general practice'}
                                        </StrategyTag>
                                        <PriorityTag className={`priority-${rec.priority}`} $colorScheme={colorScheme}>
                                            {rec.priority} priority
                                        </PriorityTag>
                                    </RecommendationFooter>
                                </RecommendationCard>
                            );
                        })
                    )}
                </RecommendationsList>

                {recommendations.length > 0 && (
                    <RecommendationsFooter>
                        <RecommendationTip>
                            💡 <strong>Tip:</strong> Focus on high-priority recommendations first.
                            They're tailored to address your specific learning needs!
                        </RecommendationTip>
                        <FooterThemeSelector>
                            <label>
                                🎨 <strong>Color Schemes:</strong> Try different themes to see complementary and triadic color combinations!
                            </label>
                            <select
                                value={colorScheme}
                                onChange={(e) => setColorScheme(e.target.value)}
                            >
                                <option value="original">Original</option>
                                <option value="complementary">Complementary</option>
                                <option value="triadic">Triadic</option>
                            </select>
                        </FooterThemeSelector>
                    </RecommendationsFooter>
                )}
            </Container>
        </MobileContainer>
    );
};

export default DailyRecommendations;