import React, { useEffect, useState } from 'react';

import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft, Check, Code } from 'react-feather';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

import { loadIndex, loadItem } from '../content/loader';
import FullScreenLoader from '../components/Loader/FullScreenLoader';

const Container = styled.div`
  max-width: 820px;
  margin: 0 auto;
  padding: 20px 20px 5rem;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  min-height: 100vh;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-decoration: none;
  font-size: 0.9rem;
  margin-bottom: 1.75rem;

  &:hover { color: ${({ theme }) => theme.colors.primary}; }
`;

const GroupLabel = styled.p`
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.primary};
  margin: 0 0 0.4rem;
`;

const Title = styled.h1`
  font-size: 2.1rem;
  font-weight: 700;
  margin: 0 0 0.6rem;
`;

const Summary = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 1.05rem;
  line-height: 1.6;
  margin: 0 0 2rem;
`;

/**
 * Markdown is authored content, so the reader styles the rendered tags here
 * rather than expecting the author to carry classes through.
 */
const Article = styled.div`
  line-height: 1.7;
  font-size: 1rem;

  h2 {
    font-size: 1.3rem;
    font-weight: 650;
    margin: 2.25rem 0 0.75rem;
    padding-top: 1.5rem;
    border-top: 1px solid ${({ theme }) => theme.colors.borderLight};
  }

  h3 {
    font-size: 1.08rem;
    font-weight: 600;
    margin: 1.5rem 0 0.5rem;
  }

  p { margin: 0 0 1rem; }

  ul, ol {
    margin: 0 0 1rem;
    padding-left: 1.35rem;
  }

  li { margin-bottom: 0.4rem; }

  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.88em;
    background: ${({ theme }) => theme.colors.backgroundTertiary};
    padding: 0.12em 0.38em;
    border-radius: 4px;
  }

  pre {
    background: ${({ theme }) => theme.colors.backgroundTertiary};
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;

    code { background: none; padding: 0; }
  }

  a { color: ${({ theme }) => theme.colors.primary}; }

  blockquote {
    margin: 0 0 1rem;
    padding-left: 1rem;
    border-left: 3px solid ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

const Panel = styled.section`
  margin-top: 2.5rem;
  padding: 1.35rem 1.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
`;

const PanelTitle = styled.h2`
  font-size: 1rem;
  font-weight: 650;
  margin: 0 0 0.9rem;
`;

const TakeawayList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Takeaway = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
  line-height: 1.55;

  &:last-child { margin-bottom: 0; }

  svg {
    color: ${({ theme }) => theme.colors.accent};
    flex-shrink: 0;
    margin-top: 4px;
  }
`;

const LinkRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Pill = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  font-size: 0.87rem;

  &:hover { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const Message = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: 3rem 1rem;
`;

/**
 * Reader for one System Design topic.
 *
 * A topic is prose: it has no difficulty, no test cases and no pass/fail, so
 * this page shares nothing with the sandbox. `prerequisites` and
 * `relatedProblems` are resolved against the index so links can show real
 * titles instead of raw slugs.
 */
function TopicReader() {
  const { slug } = useParams();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      const index = await loadIndex();
      const entry = index.items.find(
        (item) => item.slug === slug && item.type === 'topic',
      );

      if (!entry) {
        if (!cancelled) setState({ status: 'missing' });
        return;
      }

      const topic = await loadItem(entry.slug, entry.h);
      if (cancelled) return;

      const bySlug = new Map(index.items.map((item) => [item.slug, item]));
      const resolve = (slugs) => (slugs || [])
        .map((s) => bySlug.get(s))
        .filter(Boolean);

      setState({
        status: 'ready',
        topic,
        prerequisites: resolve(topic.prerequisites),
        relatedProblems: resolve(topic.relatedProblems),
      });
    })().catch((err) => {
      if (!cancelled) setState({ status: 'error', message: err.message });
    });

    return () => { cancelled = true; };
  }, [slug]);

  if (state.status === 'loading') return <FullScreenLoader show />;

  if (state.status === 'missing') {
    return (
      <Container>
        <BackLink to="/system-design"><ArrowLeft size={15} /> All topics</BackLink>
        <Message>No system design topic called &ldquo;{slug}&rdquo;.</Message>
      </Container>
    );
  }

  if (state.status === 'error') {
    return (
      <Container>
        <BackLink to="/system-design"><ArrowLeft size={15} /> All topics</BackLink>
        <Message>Could not load this topic: {state.message}</Message>
      </Container>
    );
  }

  const { topic, prerequisites, relatedProblems } = state;

  // Most bodies open with the same sentence as the summary — the summary is
  // written for the index card. Showing both prints it twice.
  const summary = (topic.summary || '').trim();
  const showSummary = summary !== ''
    && !topic.body.trimStart().startsWith(summary);

  return (
    <Container>
      <BackLink to="/system-design"><ArrowLeft size={15} /> All topics</BackLink>

      <GroupLabel>{topic.group}</GroupLabel>
      <Title>{topic.title}</Title>
      {showSummary && <Summary>{topic.summary}</Summary>}

      {prerequisites.length > 0 && (
        <Panel>
          <PanelTitle>Read these first</PanelTitle>
          <LinkRow>
            {prerequisites.map((item) => (
              <Pill key={item.slug} to={`/system-design/${item.slug}`}>
                {item.title}
              </Pill>
            ))}
          </LinkRow>
        </Panel>
      )}

      <Article>
        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
          {topic.body}
        </ReactMarkdown>
      </Article>

      {topic.keyTakeaways?.length > 0 && (
        <Panel>
          <PanelTitle>Key takeaways</PanelTitle>
          <TakeawayList>
            {topic.keyTakeaways.map((point) => (
              <Takeaway key={point}>
                <Check size={15} />
                <span>{point}</span>
              </Takeaway>
            ))}
          </TakeawayList>
        </Panel>
      )}

      {relatedProblems.length > 0 && (
        <Panel>
          <PanelTitle>Practise these</PanelTitle>
          <LinkRow>
            {relatedProblems.map((item) => (
              <Pill
                key={item.slug}
                to={`/codesandbox?question=${item.link || item.slug}`}
              >
                <Code size={14} />
                {item.title}
              </Pill>
            ))}
          </LinkRow>
        </Panel>
      )}
    </Container>
  );
}

export default TopicReader;
