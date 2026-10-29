import React from 'react';
import { contentUrl } from '../../utils/navigation';

import { Link, useOutletContext } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowRight, BookOpen, HelpCircle, Edit3 } from 'react-feather';

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
  flex-wrap: wrap;
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
  gap: 0.8rem;
  padding: 0.85rem 0;
  border-top: 1px solid ${({ theme }) => theme.colors.borderLight};
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.93rem;

  &:hover { color: ${({ theme }) => theme.colors.primary}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.primary}; outline-offset: 3px; }

  > svg:last-child {
    margin-left: auto;
    opacity: 0.45;
  }
`;

const TopicText = styled.div`
  flex: 1;
  min-width: 0;
  strong { display: block; font-weight: 600; }
  p {
    margin: 0.3rem 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.85rem;
    line-height: 1.5;
  }
`;

const TopicMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.4rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.75rem;
`;

const PathIntro = styled.section`
  padding: clamp(1.2rem, 3vw, 2rem);
  margin-bottom: 2rem;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  h2 { font-size: 1.25rem; margin: 0 0 0.7rem; }
  p { color: ${({ theme }) => theme.colors.textSecondary}; line-height: 1.65; }
`;

const Stats = styled.dl`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 2rem;
  margin: 1.25rem 0;
  > div { display: flex; flex-direction: column-reverse; gap: 0.2rem; }
  dt { color: ${({ theme }) => theme.colors.textSecondary}; font-size: 0.8rem; }
  dd { margin: 0; font-size: 1.5rem; font-weight: 700; }
`;

const StartLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const StartLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.backgroundTertiary};
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  &:hover { border-color: ${({ theme }) => theme.colors.primary}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.primary}; outline-offset: 3px; }
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

    const topics = modules.flatMap((module) => module.topics);
    const concepts = topics.filter((topic) => topic.kind === 'concept');
    const cases = topics.filter((topic) => topic.kind === 'case_study');
    const checks = topics.filter((topic) => quizByTopic.has(topic.slug)).length;
    const firstTopic = topics[0];
    const firstCase = cases[0];

    return (
        <Container>
            <Title>System Design</Title>
            <Lede>
                Learn to deliver a complete design, not memorize a diagram. Follow the path from
                interview method to core concepts, technology choices, failure-handling patterns
                and full design practice.
            </Lede>

            <PathIntro aria-labelledby="sd-path-title">
                <h2 id="sd-path-title">Learn a little. Design it. Defend the tradeoffs.</h2>
                <p>
                    Start with the delivery framework. For each concept, explain when you would
                    use it and what can go wrong. Then attempt a case study aloud before reading
                    the walkthrough. Use estimates where they change a decision, not as a ritual.
                </p>
                <Stats>
                    <div><dt>Concept lessons</dt><dd>{concepts.length}</dd></div>
                    <div><dt>Design case studies</dt><dd>{cases.length}</dd></div>
                    <div><dt>Knowledge checks</dt><dd>{checks}</dd></div>
                </Stats>
                <StartLinks>
                    {firstTopic && <StartLink to={contentUrl(firstTopic)}>Start the learning path <ArrowRight size={16} /></StartLink>}
                    {firstCase && <StartLink to={contentUrl(firstCase)}><Edit3 size={16} /> Try a design problem</StartLink>}
                </StartLinks>
                <p>Practice is self-guided today. Knowledge checks test concepts; they are not AI interview scores.</p>
            </PathIntro>

            {modules.map((module, index) => (
                <ModuleCard key={module.slug}>
                    <ModuleHead>
                        <BookOpen size={16} />
                        <ModuleTitle>{index + 1}. {module.title}</ModuleTitle>
                        <Badge $muted={module.topics.length === 0}>
                            {module.topics.length > 0 ? `${module.topics.length} ${module.topics.length === 1 ? 'topic' : 'topics'}` : 'Planned'}
                        </Badge>
                    </ModuleHead>
                    {module.summary && <ModuleSummary>{module.summary}</ModuleSummary>}

                    {module.topics.map((topic) => (
                        <TopicRow key={topic.slug} to={contentUrl(topic)}>
                            <TopicText>
                                <strong>{topic.title}</strong>
                                {topic.summary && <p>{topic.summary}</p>}
                                <TopicMeta>
                                    {topic.kind === 'case_study' ? 'Design practice' : 'Concept lesson'}
                                    {quizByTopic.has(topic.slug) && <><QuizMark size={13} /> Knowledge check</>}
                                </TopicMeta>
                            </TopicText>
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
