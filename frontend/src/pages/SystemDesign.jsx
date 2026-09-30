import React, { useEffect, useMemo, useState } from 'react';

import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { BookOpen, ArrowRight } from 'react-feather';

import { loadIndex } from '../content/loader';
import FullScreenLoader from '../components/Loader/FullScreenLoader';

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  min-height: 100vh;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  font-weight: 700;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 1.1rem;
  max-width: 620px;
  margin: 0 auto;
`;

const GroupSection = styled.section`
  margin-bottom: 2.5rem;
`;

const GroupTitle = styled.h2`
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 1rem;
`;

const TopicList = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const TopicCard = styled(Link)`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.15rem 1.25rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease, transform 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-1px);
  }
`;

const CardIcon = styled.div`
  color: ${({ theme }) => theme.colors.primary};
  display: flex;
  padding-top: 2px;
`;

const CardBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const CardTitle = styled.h3`
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 0.3rem;
`;

const CardSummary = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.92rem;
  line-height: 1.5;
`;

const Prereq = styled.span`
  display: inline-block;
  margin-top: 0.55rem;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const Chevron = styled.div`
  color: ${({ theme }) => theme.colors.textMuted};
  display: flex;
  align-self: center;
`;

const Message = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: 3rem 1rem;
`;

/**
 * The System Design index.
 *
 * Deliberately NOT the question list. Topics are read, not solved, so there
 * is no difficulty pill and no solved ring — rendering either would repeat
 * the domain-modelling error this page exists to correct.
 *
 * Pure CDN: no redux, no saga, no backend request, guest or not.
 */
function SystemDesign() {
  const [topics, setTopics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    loadIndex()
      .then((index) => {
        if (cancelled) return;
        setTopics(index.items.filter((item) => item.type === 'topic'));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => { cancelled = true; };
  }, []);

  const groups = useMemo(() => {
    if (!topics) return [];

    const byGroup = new Map();
    topics.forEach((topic) => {
      if (!byGroup.has(topic.group)) byGroup.set(topic.group, []);
      byGroup.get(topic.group).push(topic);
    });

    return Array.from(byGroup, ([name, items]) => ({
      name,
      items: [...items].sort((a, b) => a.order - b.order),
    }));
  }, [topics]);

  if (error) {
    return (
      <Container>
        <Message>Could not load system design topics: {error}</Message>
      </Container>
    );
  }

  if (!topics) return <FullScreenLoader show />;

  return (
    <Container>
      <Header>
        <Title>System Design</Title>
        <Subtitle>
          Read-through topics, not coding problems. Each one walks the scenario,
          the constraints and what a strong answer covers.
        </Subtitle>
      </Header>

      {groups.length === 0 && <Message>No topics published yet.</Message>}

      {groups.map((group) => (
        <GroupSection key={group.name}>
          <GroupTitle>{group.name}</GroupTitle>
          <TopicList>
            {group.items.map((topic) => (
              <TopicCard key={topic.slug} to={`/system-design/${topic.slug}`}>
                <CardIcon><BookOpen size={18} /></CardIcon>
                <CardBody>
                  <CardTitle>{topic.title}</CardTitle>
                  {topic.summary && <CardSummary>{topic.summary}</CardSummary>}
                  {topic.prerequisites?.length > 0 && (
                    <Prereq>
                      Read first: {topic.prerequisites.length} topic
                      {topic.prerequisites.length === 1 ? '' : 's'}
                    </Prereq>
                  )}
                </CardBody>
                <Chevron><ArrowRight size={16} /></Chevron>
              </TopicCard>
            ))}
          </TopicList>
        </GroupSection>
      ))}
    </Container>
  );
}

export default SystemDesign;
