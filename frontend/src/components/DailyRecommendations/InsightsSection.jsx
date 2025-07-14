import React from 'react';
import {
    Section,
    InsightGroup,
    Title,
    TagsList,
    Tag,
    BatchInfo,
    BatchDate,
    BatchStatus
} from './InsightsSection.styles';

const InsightsSection = ({
    analysis,
    topicMastery,
    batchInfo,
    progress,
    streakInfo,
    mobile = false
}) => {
    return (
        <Section mobile={mobile}>
            {/* Focus Areas */}
            {analysis?.weakAreas && analysis.weakAreas.length > 0 && (
                <InsightGroup mobile={mobile}>
                    <Title mobile={mobile}>
                        💪 Focus Areas
                    </Title>
                    <TagsList mobile={mobile}>
                        {analysis.weakAreas.slice(0, 4).map((area, index) => (
                            <Tag key={index} mobile={mobile}>
                                <span>{area}</span>
                            </Tag>
                        ))}
                    </TagsList>
                </InsightGroup>
            )}

            {/* Learning Progress */}
            {topicMastery.length > 0 && (
                <InsightGroup mobile={mobile}>
                    <Title mobile={mobile}>
                        🎯 Learning Progress
                    </Title>
                    <TagsList mobile={mobile}>
                        {topicMastery
                            .filter(topic => topic.progress && topic.progress.topicCoverage > 0)
                            .slice(0, 3)
                            .map((topic, index) => (
                                <Tag
                                    key={`topic-${index}`}
                                    $progress={topic.progress.topicCoverage}
                                    mobile={mobile}
                                >
                                    <span>{topic.topic}</span>
                                </Tag>
                            ))}
                    </TagsList>
                </InsightGroup>
            )}

            {batchInfo && (
                <BatchInfo mobile={mobile}>
                    <BatchDate mobile={mobile}>
                        📅 {batchInfo.generatedAt ? new Date(batchInfo.generatedAt).toLocaleDateString() : 'Today'}
                    </BatchDate>
                    <BatchStatus mobile={mobile}>
                        {progress ? `${progress.completed}/${progress.total} completed` : 'Daily batch'}
                    </BatchStatus>
                    {streakInfo.longestStreak > 0 && (
                        <BatchStatus style={{ marginTop: '4px' }} mobile={mobile}>
                            🏆 Best streak: {streakInfo.longestStreak} days
                        </BatchStatus>
                    )}
                </BatchInfo>
            )}
        </Section>
    );
};

export default InsightsSection; 