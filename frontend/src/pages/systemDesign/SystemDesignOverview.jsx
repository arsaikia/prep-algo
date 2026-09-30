import React from 'react';

import { Link, useOutletContext } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowRight, BookOpen, HelpCircle } from 'react-feather';

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 6rem;
  color: ${({ theme }) => theme.colors.text};
`;

const Title = styled.h1`
  font-size: 2.1rem;
  font-weight: 700;
  margin: 0 0 0.6rem;
`;

const Lede = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 1.05rem;
  line-height: 1.65;
  margin: 0 0 2.5rem;
  max-width: 62ch;
`;

const ModuleCard = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 1.35rem 1.5rem;
  margin-bottom: 1rem;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
`;

const ModuleHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
`;

const ModuleTitle = styled.h2`
  font-size: 1.15rem;
  font-weight: 650;
  margin: 0;
`;

const Badge = styled.span`
  margin-left: auto;
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
  color: ${({ theme, $muted }) => ($muted ? theme.colors.textSecondary : theme.colors.primary)};
  background: ${({ theme }) => theme.colors.backgroundTertiary};
`;

const ModuleSummary = styled.p`
  margin: 0 0 1rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.6;
  font-size: 0.93rem;
`;

const TopicRow = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0;
  border-top: 1px solid ${({ theme }) => theme.colors.borderLight};
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.93rem;

  &:hover { color: ${({ theme }) => theme.colors.primary}; }

  svg:last-child {
    margin-left: auto;
    opacity: 0.45;
  }
`;

const QuizMark = styled(HelpCircle)`
  color: ${({ theme }) => theme.colors.primary};
  opacity: 0.8;
`;

const Pending = styled.p`
  margin: 0;
  padding-top: 0.75rem;
  border-top: 1px solid ${({ theme }) => theme.colors.borderLight};
  font-size: 0.88rem;
  font-style: italic;
  color: ${({ theme }) => theme.colors.textSecondary};
  opacity: 0.8;
`;

const Message = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
`;

/**
 * The curriculum landing page.
 *
 * It shows the whole syllabus, written or not. A learner deciding whether to
 * work through system design here needs to see the shape of the thing —
 * listing only the finished chapters would misrepresent both the coverage and
 * the plan.
 */
function SystemDesignOverview() {
    const { modules, quizByTopic, status } = useOutletContext();

    if (status === 'loading') return <Container><Message>Loading curriculum…</Message></Container>;
    if (status === 'error') return <Container><Message>Could not load the curriculum.</Message></Container>;

    const written = modules.reduce((n, m) => n + m.topics.length, 0);

    return (
        <Container>
            <Title>System Design</Title>
            <Lede>
                Concepts first, then the case studies that apply them. Each topic is a short
                read with a comprehension check at the end; case studies walk a full design
                from requirements to bottlenecks. {written} topics available.
            </Lede>

            {modules.map((module) => (
                <ModuleCard key={module.slug}>
                    <ModuleHead>
                        <BookOpen size={16} />
                        <ModuleTitle>{module.title}</ModuleTitle>
                        <Badge $muted={module.topics.length === 0}>
                            {module.topics.length > 0 ? `${module.topics.length} topics` : 'Planned'}
                        </Badge>
                    </ModuleHead>
                    {module.summary && <ModuleSummary>{module.summary}</ModuleSummary>}

                    {module.topics.map((topic) => (
                        <TopicRow key={topic.slug} to={`/system-design/${topic.slug}`}>
                            {quizByTopic.has(topic.slug) && <QuizMark size={13} />}
                            {topic.title}
                            <ArrowRight size={15} />
                        </TopicRow>
                    ))}

                    {module.topics.length === 0 && (
                        <Pending>Not written yet — this chapter is on the roadmap.</Pending>
                    )}
                </ModuleCard>
            ))}
        </Container>
    );
}

export default SystemDesignOverview;
