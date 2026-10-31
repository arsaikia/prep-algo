import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import apiClient from '../../api/client.js';
import readApiError from '../../utils/apiError.js';
import { requestSignIn } from '../../utils/navigation.js';
import { TimeTracker } from '../../utils/timerState.js';
import { useSelector } from 'react-redux';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
`;

const QuestionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 8px;
`;

const DifficultyBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 16px;
  background: ${({ $difficulty, theme }) =>
    $difficulty === 'Easy' ? theme.colors.statusSuccess + '20' :
    $difficulty === 'Medium' ? theme.colors.statusWarning + '20' :
    theme.colors.statusError + '20'};
  color: ${({ $difficulty, theme }) =>
    $difficulty === 'Easy' ? theme.colors.statusSuccess :
    $difficulty === 'Medium' ? theme.colors.statusWarning :
    theme.colors.statusError};
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 24px;
  line-height: 1.6;
  white-space: pre-line;
`;

const OptionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
`;

const Option = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 2px solid ${({ theme, $selected, $correct, $incorrect }) =>
    $correct ? theme.colors.statusSuccess :
    $incorrect ? theme.colors.statusError :
    $selected ? theme.colors.primary :
    theme.colors.border};
  border-radius: 8px;
  cursor: ${({ $locked }) => $locked ? 'default' : 'pointer'};
  background: ${({ theme, $correct, $incorrect }) =>
    $correct ? theme.colors.statusSuccess + '10' :
    $incorrect ? theme.colors.statusError + '10' :
    theme.colors.backgroundSecondary};
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    ${({ $locked, theme }) => !$locked && `border-color: ${theme.colors.primary};`}
  }

  input {
    margin-top: 3px;
  }
`;

const OptionBody = styled.span`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const OptionText = styled.span`
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.5;
`;

const OptionTag = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ $correct, theme }) => $correct ? theme.colors.statusSuccess : theme.colors.statusError};
`;

const OptionExplanation = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 14px;
  line-height: 1.5;
`;

const SubmitButton = styled.button`
  padding: 12px 32px;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ResultBox = styled.div`
  margin-top: 16px;
  padding: 16px;
  border-radius: 8px;
  background: ${({ $passed, theme }) =>
    $passed ? theme.colors.statusSuccess + '15' : theme.colors.statusError + '15'};
  border: 1px solid ${({ $passed, theme }) =>
    $passed ? theme.colors.statusSuccess : theme.colors.statusError};
`;

const ResultTitle = styled.div`
  font-weight: 600;
  font-size: 16px;
  color: ${({ $passed, theme }) =>
    $passed ? theme.colors.statusSuccess : theme.colors.statusError};
`;

const ProgressNote = styled.p`
  margin: 8px 0 0;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};

  a { color: ${({ theme }) => theme.colors.primary}; }
`;

const ErrorBox = styled.div`
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.statusError};
  background: ${({ theme }) => theme.colors.statusError + '15'};
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.5;
`;

/**
 * Grades a signed-in answer on the route that records progress. Guests can't
 * call it, so they use the public grading route and see the same result
 * without anything being saved.
 */
const gradeAnswer = async (question, selectedOptionId, isGuest, submissionId, timeTaken) => {
  const url = isGuest
    ? `/quiz/${encodeURIComponent(question.slug)}/grade`
    : `/questions/${encodeURIComponent(question.slug)}/submit-mcq`;
  const response = await apiClient.post(url, { selectedOptionId, submissionId, timeTaken, contentRevision: question.revision });
  return response.data.data;
};

const McqSolver = ({ question, isGuest = false, onComplete, completeLabel = 'Complete and close quiz' }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);
  const [closed, setClosed] = useState(false);
  const inFlight = useRef(null);
  const identityVersion = useRef(0);
  const pendingSubmission = useRef(null);
  const userId = useSelector((state) => state.auth.userId);
  const identity = `${question.slug}:${question.revision}:${userId}:${isGuest}`;
  const contentIdentity = `${question.slug}:${question.revision}`;
  const previousContent = useRef(contentIdentity);
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const mounted = useRef(false);
  const tracker = useRef(null);
  if (!tracker.current) tracker.current = new TimeTracker({
    storageKey: `quiz-session:${question.slug}`,
    onStorageError: () => setStorageWarning(true),
  });
  useEffect(() => {
    identityVersion.current += 1;
    inFlight.current = null;
    mounted.current = true;
    tracker.current.startTracking(question.slug, userId);
    if (previousContent.current !== contentIdentity) setSelectedOption(null);
    previousContent.current = contentIdentity;
    setResult(null);
    setError('');
    setSubmitting(false);
    setClosed(false);
    pendingSubmission.current = null;
    return () => { mounted.current = false; };
  }, [identity]);

  const handleSubmit = async () => {
    if (!selectedOption || submitting || inFlight.current) return;
    if (result?.identity === identity && (isGuest || result.attemptSaved !== false)) return;
    const requestIdentity = identity;
    const requestVersion = identityVersion.current;
    const requestToken = {};
    inFlight.current = requestToken;
    const stale = () => !mounted.current || identityRef.current !== requestIdentity || identityVersion.current !== requestVersion;
    setSubmitting(true);
    setError('');
    try {
      const signature = JSON.stringify([identity, selectedOption]);
      if (pendingSubmission.current?.signature !== signature) {
        pendingSubmission.current = { signature, id: crypto.randomUUID(), timeTaken: tracker.current.getElapsedSeconds() };
      }
      const graded = await gradeAnswer(question, selectedOption, isGuest, pendingSubmission.current.id, pendingSubmission.current.timeTaken);
      if (stale()) return;
      if (!graded || typeof (graded.passed ?? graded.correct) !== 'boolean') throw new Error('Invalid grading response.');
      setResult({ ...graded, identity });
      if (isGuest || graded.attemptSaved) pendingSubmission.current = null;
      if (isGuest || graded.attemptSaved) tracker.current.stopTracking(Boolean(graded.passed ?? graded.correct));
    } catch (err) {
      if (stale()) return;
      // The selection is kept so the answer can be resubmitted as-is.
      setError(`Could not check your answer. ${readApiError(err)}`);
    } finally {
      if (inFlight.current === requestToken) inFlight.current = null;
      if (!stale()) setSubmitting(false);
    }
  };

  const submitted = result?.identity === identity;
  const passed = Boolean(result?.passed ?? result?.correct);
  const explanationFor = new Map((result?.explanations || []).map(e => [e.id, e.explanation]));

  if (closed) {
    return <Container role="status"><QuestionTitle>Quiz complete</QuestionTitle><ProgressNote>Nice work! You can close this quiz and continue learning.</ProgressNote></Container>;
  }

  return (
    <Container>
      <QuestionTitle>{question.title}</QuestionTitle>
      {question.difficulty && (
        <DifficultyBadge $difficulty={question.difficulty}>{question.difficulty}</DifficultyBadge>
      )}
      <Description>{question.description}</Description>
      {storageWarning && <ProgressNote role="status">Local storage is unavailable. Your practice timer cannot survive a refresh.</ProgressNote>}

      <OptionsContainer role="radiogroup" aria-label="Answer options">
        {question.mcqOptions?.map(opt => {
          const isAnswer = submitted && opt.id === result.correctOptionId;
          const isWrongPick = submitted && opt.id === selectedOption && !passed;
          const explanation = submitted ? explanationFor.get(opt.id) : null;

          return (
            <Option
              key={opt.id}
              $selected={selectedOption === opt.id}
              $correct={isAnswer}
              $incorrect={isWrongPick}
              $locked={submitted || submitting}
            >
              <input
                type="radio"
                name="mcq"
                value={opt.id}
                checked={selectedOption === opt.id}
                onChange={() => setSelectedOption(opt.id)}
                disabled={submitted || submitting}
              />
              <OptionBody>
                <OptionText>{opt.text}</OptionText>
                {isAnswer && <OptionTag $correct>Correct answer</OptionTag>}
                {isWrongPick && <OptionTag>Your answer</OptionTag>}
                {explanation && <OptionExplanation>{explanation}</OptionExplanation>}
              </OptionBody>
            </Option>
          );
        })}
      </OptionsContainer>

      {!submitted && (
        <SubmitButton onClick={handleSubmit} disabled={!selectedOption || submitting} aria-busy={submitting}>
          {submitting ? 'Checking…' : 'Submit Answer'}
        </SubmitButton>
      )}

      {error && <ErrorBox role="alert">{error}</ErrorBox>}

      <div aria-live="polite">
        {submitted && (
          <ResultBox $passed={passed}>
            <ResultTitle $passed={passed}>{passed ? 'Correct!' : 'Incorrect'}</ResultTitle>
            {!passed && (
              <ProgressNote>The correct answer is highlighted above, with an explanation for each option.</ProgressNote>
            )}
            {isGuest ? (
              <ProgressNote>
                <button onClick={requestSignIn}>Sign in</button> to save your progress.
              </ProgressNote>
            ) : passed && (
              <ProgressNote>
                {result.progressSaved
                  ? 'Saved to your progress.'
                  : 'Your answer is correct, but it could not be saved to your progress.'}
              </ProgressNote>
            )}
            {!isGuest && result.attemptSaved === false && (
              <SubmitButton onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving…' : 'Retry saving answer'}
              </SubmitButton>
            )}
            {passed ? <SubmitButton
              disabled={submitting || (!isGuest && result.attemptSaved === false)}
              onClick={() => {
                if (!submitted || !passed || submitting) return;
                setClosed(true);
                onComplete?.();
              }}
            >{completeLabel}</SubmitButton> : <SubmitButton disabled={submitting} onClick={() => {
              pendingSubmission.current = null;
              setResult(null);
              setSelectedOption(null);
              setError('');
              tracker.current.stopTracking(false);
              tracker.current.startTracking(question.slug, userId);
            }}>
              Try a new attempt
            </SubmitButton>}
          </ResultBox>
        )}
      </div>
    </Container>
  );
};

export default McqSolver;
