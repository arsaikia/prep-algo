import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import McqSolver from '../../components/McqSolver/McqSolver';
import { toSandboxQuestion } from '../../content/sandboxQuestion';

const Wrap = styled.section`
  margin-top: 3rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  h2 { font-size: 1.25rem; }
`;

function TopicQuiz({ quiz }) {
  const { status } = useSelector((state) => state.auth);
  if (!quiz?.options?.length) return null;
  return (
    <Wrap aria-label="Check your understanding">
      {['unknown', 'restoring'].includes(status)
        ? <p role="status">Restoring your session…</p>
        : <McqSolver key={`${quiz.slug}:${quiz.revision}`} question={toSandboxQuestion(quiz)} isGuest={status !== 'authenticated'} />}
    </Wrap>
  );
}

export default TopicQuiz;
