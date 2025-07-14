import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressRing from './ProgressRing';
import MetricCard from './MetricCard';
import InsightsSection from './InsightsSection';
import {
    DesktopCard,
    Header,
    Title,
    SparkleIcon,
    TitleMain,
    TitleSub,
    BrowseAllLink,
    MetricsGrid
} from './DesktopAnalyticsCard.styles';

const DesktopAnalyticsCard = ({ analysis, progress, batchInfo }) => {
    const navigate = useNavigate();

    if (!analysis && !progress) {
        return null;
    }

    // Extract streak and mastery info from enhanced analytics
    const streakInfo = analysis?.streakInfo || { currentStreak: 0, longestStreak: 0 };
    const topicMastery = analysis?.topicMastery || [];
    const masteredTopics = topicMastery.filter(topic => topic.level === 'mastered').length;

    return (
        <DesktopCard>
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

            {analysis && (
                <MetricsGrid>
                    {progress && (
                        <MetricCard
                            icon={<ProgressRing
                                percentage={(progress.completed / progress.total) * 100}
                                size="large"
                            />}
                            label="Today's Progress"
                            subtext={`${progress.completed}/${progress.total} completed`}
                        />
                    )}

                    <MetricCard
                        icon="🎯"
                        value={analysis.userLevel.toUpperCase()}
                        valueClass={`level-${analysis.userLevel}`}
                        label="Skill Level"
                        subtext="Current proficiency"
                    />

                    <MetricCard
                        icon="✅"
                        value={analysis.totalSolved}
                        label="Total Solved"
                        subtext="All time progress"
                    />

                    <MetricCard
                        icon="🔥"
                        value={streakInfo.currentStreak}
                        label="Current Streak"
                        subtext={streakInfo.currentStreak === 0 ? 'Start today!' : 'Keep it going!'}
                    />

                    <MetricCard
                        icon="⭐"
                        value={masteredTopics}
                        label="Topics Mastered"
                        subtext="Complete understanding"
                    />
                </MetricsGrid>
            )}

            <InsightsSection
                analysis={analysis}
                topicMastery={topicMastery}
                batchInfo={batchInfo}
                progress={progress}
                streakInfo={streakInfo}
            />
        </DesktopCard>
    );
};

export default DesktopAnalyticsCard; 