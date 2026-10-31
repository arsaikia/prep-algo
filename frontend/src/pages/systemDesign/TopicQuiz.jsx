import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import McqSolver from '../../components/McqSolver/McqSolver';
import { toSandboxQuestion } from '../../content/sandboxQuestion';
import { loadItem } from '../../content/loader';

const Wrap = styled.section`
  margin-top: 3rem;
  scroll-margin-top: 4.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  h2 { font-size: 1.25rem; }
`;

const Status = styled.div`
  padding: 1.25rem 1.5rem;
  color: ${({ theme }) => theme.colors.text};
  p { color: ${({ theme }) => theme.colors.textSecondary}; line-height: 1.5; }
  button {
    border: 1px solid ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primary};
    color: #fff;
    border-radius: 8px;
    padding: 0.6rem 1rem;
    cursor: pointer;
  }
`;

const Progress = styled.p`
  margin: 0;
  padding: 1.25rem 1.5rem 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.9rem;
`;

function QuizSequence({ entries, isGuest }) {
  const [position, setPosition] = useState(0);
  const [finished, setFinished] = useState(false);
  const [state, setState] = useState({ status: 'loading' });
  const [retry, setRetry] = useState(0);
  const panel = useRef(null);
  const entry = entries[position];
  const identity = `${entry.slug}:${entry.h}`;

  useEffect(() => {
    if (finished) return undefined;
    let cancelled = false;
    setState({ status: 'loading' });
    loadItem(entry.slug, entry.h)
      .then((quiz) => {
        if (!quiz.options?.length) throw new Error('This quiz has no answer options.');
        if (!cancelled) setState({ status: 'ready', identity, quiz });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', identity, message: error.message });
      });
    return () => { cancelled = true; };
  }, [entry.slug, entry.h, identity, retry, finished]);

  useEffect(() => {
    if (finished || (position > 0 && state.status === 'ready' && state.identity === identity)) {
      panel.current?.focus({ preventScroll: true });
      panel.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [position, state, finished, identity]);

  const advance = () => {
    if (position === entries.length - 1) setFinished(true);
    else setPosition((value) => value + 1);
  };

  return (
    <Wrap ref={panel} tabIndex={-1} aria-label="Check your understanding">
      {finished ? (
        <Status role="status">
          <h2>Knowledge check complete</h2>
          <p>You worked through all {entries.length} questions. Nice work! The quiz is closed; keep reading or move on when you’re ready.</p>
        </Status>
      ) : (
        <>
          <Progress role="status">Question {position + 1} of {entries.length}</Progress>
          {state.identity !== identity || state.status === 'loading'
            ? <Status role="status">Loading question…</Status>
            : state.status === 'error'
              ? <Status role="alert">
                <p>Could not load this question: {state.message}</p>
                <button onClick={() => setRetry((value) => value + 1)}>Retry question</button>
              </Status>
              : <McqSolver
                key={identity}
                question={toSandboxQuestion(state.quiz)}
                isGuest={isGuest}
                onComplete={advance}
                completeLabel={position < entries.length - 1 ? 'Next question' : 'Complete quiz'}
              />}
        </>
      )}
    </Wrap>
  );
}

function TopicQuiz({ entries = [] }) {
  const { status, userId } = useSelector((state) => state.auth);
  if (!entries.length) return null;
  return (
    ['unknown', 'restoring'].includes(status)
      ? <Wrap><Status role="status">Restoring your session…</Status></Wrap>
      : <QuizSequence key={`${status}:${userId}`} entries={entries} isGuest={status !== 'authenticated'} />
  );
}

export default TopicQuiz;
