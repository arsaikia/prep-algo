import React, { useEffect, useMemo, useState } from 'react';

import { Link, useLocation, useOutletContext, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft, ArrowRight, Check, CheckCircle, Circle, Code } from 'react-feather';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { contentUrl } from '../utils/navigation';

import { loadIndex, loadItem } from '../content/loader';
import FullScreenLoader from '../components/Loader/FullScreenLoader';
import TopicQuiz from './systemDesign/TopicQuiz';
import MermaidDiagram from '../components/systemDesign/MermaidDiagram';
import TableOfContents from '../components/systemDesign/TableOfContents';
import { extractHeadings, hastText, mermaidCode, rehypeReaderEnhancements } from '../components/systemDesign/markdown';
import { findTopic, isReference, lessonNeighbours } from '../components/systemDesign/curriculum';
import useCompletedLessons from '../hooks/useCompletedLessons';

const TOC_MIN_SECTIONS = 4;

// Ids are assigned after sanitizing so they are not `user-content-` prefixed.
const rehypePlugins = [rehypeSanitize, rehypeReaderEnhancements];
const remarkPlugins = [remarkGfm];

const markdownComponents = {
  table: ({ children }) => (
    <div className="table-scroll" role="region" aria-label="Article table" tabIndex={0}><table>{children}</table></div>
  ),
  pre: ({ node, children }) => {
    const code = mermaidCode(node);
    if (code) {
      return <MermaidDiagram source={hastText(code).trimEnd()} label={code.properties.dataDiagramLabel || 'Diagram'} />;
    }
    return <pre tabIndex={0}>{children}</pre>;
  },
};

/*
 * The reader is a column inside the System Design shell, not a page. The shell
 * owns the viewport and the scroll container, so this sets its own measure and
 * nothing else — no `min-height`, no background of its own.
 */
const Container = styled.div`
  max-width: 820px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 6rem;
  color: ${({ theme }) => theme.colors.text};
`;

const GroupLabel = styled.p`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.primary};
  margin: 0 0 0.4rem;
`;

const KindTag = styled.span`
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
  border: 1px solid currentColor;
  font-size: 0.7rem;
  font-weight: 700;
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
  min-width: 0;
  overflow-wrap: anywhere;
  .table-scroll { overflow-x: auto; margin: 1rem 0; max-width: 100%; }
  .table-scroll td, .table-scroll th { overflow-wrap: normal; }
  h1, h2, h3, h4 { scroll-margin-top: 4.5rem; }
  table { width: 100%; border-collapse: collapse; font-size: .92rem; }
  th, td { padding: .6rem .8rem; border: 1px solid ${({ theme }) => theme.colors.border}; text-align: left; min-width: 110px; }
  th { background: ${({ theme }) => theme.colors.backgroundTertiary}; }

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
    max-width: 100%;
    overflow-wrap: normal;

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

const CompleteRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 2.5rem;
  padding: 1rem 1.25rem;
  border: 1px solid ${({ theme, $done }) => ($done ? theme.colors.accent : theme.colors.border)};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  p { margin: 0; flex: 1 1 14rem; color: ${({ theme }) => theme.colors.textSecondary}; font-size: 0.9rem; }
`;

const CompleteButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1rem;
  border-radius: 8px;
  border: 1px solid ${({ theme, $done }) => ($done ? theme.colors.accent : theme.colors.primary)};
  background: ${({ theme, $done }) => ($done ? 'transparent' : theme.colors.primary)};
  color: ${({ theme, $done }) => ($done ? theme.colors.accent : '#fff')};
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.primary}; outline-offset: 3px; }
`;

const LessonNavigation = styled.nav`
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  a {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    max-width: 100%;
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    line-height: 1.5;
  }
  a:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
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
  const { quizByTopic, modules = [] } = useOutletContext() ?? {};
  const { hash } = useLocation();
  const { completed, toggle } = useCompletedLessons();
  const [state, setState] = useState({ status: 'loading' });
  const [quiz, setQuiz] = useState(null);
  const [quizError, setQuizError] = useState('');
  const [retry, setRetry] = useState(0);
  const [quizRetry, setQuizRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    setQuiz(null);
    setQuizError('');

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
  }, [slug, retry]);

  useEffect(() => {
    let cancelled = false;
    const entry = quizByTopic?.get(slug);
    setQuiz(null);
    setQuizError('');
    if (entry) loadItem(entry.slug, entry.h)
      .then((body) => { if (!cancelled) setQuiz(body); })
      .catch((err) => { if (!cancelled) setQuizError(err.message); });
    return () => { cancelled = true; };
  }, [slug, quizByTopic, quizRetry]);

  const body = state.status === 'ready' ? state.topic.body : '';
  const sections = useMemo(() => extractHeadings(body, { minDepth: 2, maxDepth: 2 }), [body]);
  const ready = state.status === 'ready' && state.topic.slug === slug;

  // Content arrives after navigation, so the browser cannot honour a
  // `#section` in the URL by itself.
  useEffect(() => {
    if (!ready || !hash) return;
    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // Keep the raw fragment when it is not valid percent-encoding.
    }
    const target = document.getElementById(id);
    target?.scrollIntoView({ block: 'start' });
  }, [ready, hash]);

  if (state.status === 'loading' || (state.status === 'ready' && state.topic.slug !== slug)) return <FullScreenLoader show />;

  if (state.status === 'missing') {
    return (
      <Container>
        <Message>No system design topic called &ldquo;{slug}&rdquo;.</Message>
      </Container>
    );
  }

  if (state.status === 'error') {
    return (
      <Container>
        <Message>Could not load this topic: {state.message}</Message>
        <button onClick={() => setRetry((value) => value + 1)}>Retry topic</button>
      </Container>
    );
  }

  const { topic, prerequisites, relatedProblems } = state;
  const entry = findTopic(modules, slug);
  const reference = isReference(topic) || isReference(entry);
  const { previous, next, isLesson } = lessonNeighbours(modules, slug);
  const done = completed.has(slug);

  // Most bodies open with the same sentence as the summary — the summary is
  // written for the index card. Showing both prints it twice.
  const summary = (topic.summary || '').trim();
  const showSummary = summary !== ''
    && !topic.body.trimStart().startsWith(summary);

  return (
    <Container>
      <GroupLabel>{topic.group}{reference && <KindTag>Reference</KindTag>}</GroupLabel>
      <Title>{topic.title}</Title>
      {showSummary && <Summary>{topic.summary}</Summary>}

      {prerequisites.length > 0 && (
        <Panel>
          <PanelTitle>Read these first</PanelTitle>
          <LinkRow>
            {prerequisites.map((item) => (
              <Pill key={item.slug} to={contentUrl(item)}>
                {item.title}
              </Pill>
            ))}
          </LinkRow>
        </Panel>
      )}

      {sections.length >= TOC_MIN_SECTIONS && <TableOfContents key={`toc:${slug}`} headings={sections} />}

      <Article>
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={markdownComponents}
        >
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
                to={contentUrl(item)}
              >
                <Code size={14} />
                {item.title}
              </Pill>
            ))}
          </LinkRow>
        </Panel>
      )}

      {quizError && <Panel role="alert">
        <p>Could not load the optional quiz: {quizError}</p>
        <button onClick={() => setQuizRetry((value) => value + 1)}>Retry quiz</button>
      </Panel>}
      <TopicQuiz key={slug} quiz={quiz?.topic === slug ? quiz : null} />
      {isLesson && !reference && (
        <CompleteRow $done={done}>
          <p>{done ? 'You marked this lesson as complete.' : 'Finished this lesson? Track it on your learning path.'}</p>
          <CompleteButton type="button" $done={done} aria-pressed={done} onClick={() => toggle(slug)}>
            {done ? <CheckCircle size={16} /> : <Circle size={16} />}
            {done ? 'Completed' : 'Mark as complete'}
          </CompleteButton>
        </CompleteRow>
      )}
      <LessonNavigation aria-label="Learning path">
        {previous && <Link to={contentUrl(previous)} rel="prev"><ArrowLeft size={16} /> Previous: {previous.title}</Link>}
        {next ? <Link to={contentUrl(next)} rel="next">Next: {next.title} <ArrowRight size={16} /></Link>
          : <Link to="/system-design">Back to the learning path <ArrowRight size={16} /></Link>}
      </LessonNavigation>
    </Container>
  );
}

export default TopicReader;
