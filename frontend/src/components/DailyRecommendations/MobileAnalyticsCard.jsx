import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressRing from './ProgressRing';
import MetricCard from './MetricCard';
import InsightsSection from './InsightsSection';
import {
    MobileCard,
    Header,
    Title,
    SparkleIcon,
    TitleMain,
    TitleSub,
    BrowseAllLink,
    QuickStats,
    QuickStatCard,
    QuickMetricIcon,
    QuickMetricValue,
    QuickMetricLabel,
    CollapsibleContent,
    MetricsGrid,
    CollapseToggle
} from './MobileAnalyticsCard.styles';

const MobileAnalyticsCard = ({ analysis, progress, batchInfo }) => {
    const navigate = useNavigate();
    const [isMobileCollapsed, setIsMobileCollapsed] = useState(true);

    if (!analysis && !progress) {
        return null;
    }

    // Extract streak and mastery info from enhanced analytics
    const streakInfo = analysis?.streakInfo || { currentStreak: 0, longestStreak: 0 };
    const topicMastery = analysis?.topicMastery || [];
    const masteredTopics = topicMastery.filter(topic => topic.level === 'mastered').length;

    const toggleMobileCollapse = () => {
        setIsMobileCollapsed(!isMobileCollapsed);
    };

    return (
        <MobileCard>
            <Header>
                <Title>
                    <TitleMain>
                        <SparkleIcon>✨</SparkleIcon> Learning Analytics
                    </TitleMain>
                    <TitleSub>
                        Your personalized learning insights and today's progress
                    </TitleSub>
                </Title>

                <BrowseAllLink onClick={() => navigate('/all')}>
                    📚 Browse All Questions
                </BrowseAllLink>
            </Header>

            {/* Quick stats always visible */}
            {analysis && (
                <QuickStats $isExpanded={!isMobileCollapsed}>
                    {progress && (
                        <QuickStatCard>
                            <ProgressRing
                                percentage={(progress.completed / progress.total) * 100}
                                size="small"
                            />
                            <QuickMetricLabel>{progress.completed}/{progress.total} completed</QuickMetricLabel>
                        </QuickStatCard>
                    )}
                    <QuickStatCard>
                        <QuickMetricIcon>🔥</QuickMetricIcon>
                        <QuickMetricValue>{streakInfo.currentStreak}</QuickMetricValue>
                        <QuickMetricLabel>Streak</QuickMetricLabel>
                    </QuickStatCard>
                </QuickStats>
            )}

            {/* Collapsible content */}
            <CollapsibleContent $isCollapsed={isMobileCollapsed}>
                {analysis && (
                    <MetricsGrid>
                        <MetricCard
                            icon="🎯"
                            value={analysis.userLevel.toUpperCase()}
                            valueClass={`level-${analysis.userLevel}`}
                            label="Skill Level"
                            subtext="Current proficiency"
                            mobile
                        />

                        <MetricCard
                            icon="✅"
                            value={analysis.totalSolved}
                            label="Total Solved"
                            subtext="All time progress"
                            mobile
                        />

                        <MetricCard
                            icon="⭐"
                            value={masteredTopics}
                            label="Topics Mastered"
                            subtext="Complete understanding"
                            mobile
                        />
                    </MetricsGrid>
                )}

                <InsightsSection
                    analysis={analysis}
                    topicMastery={topicMastery}
                    batchInfo={batchInfo}
                    progress={progress}
                    streakInfo={streakInfo}
                    mobile
                />
            </CollapsibleContent>

            {/* Collapse toggle */}
            <CollapseToggle
                onClick={toggleMobileCollapse}
                title={isMobileCollapsed ? "Show more analytics" : "Show less"}
            >
                {isMobileCollapsed ? '⌄' : '⌃'}
            </CollapseToggle>
        </MobileCard>
    );
};

export default MobileAnalyticsCard; 