import React, { useState } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client.js';
import readApiError from '../../utils/apiError.js';

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
const gradeAnswer = async (question, selectedOptionId, isGuest) => {
  const url = isGuest
    ? `/quiz/${question.slug}/grade`
    : `/questions/${question.slug}/submit-mcq`;
  const response = await apiClient.post(url, { selectedOptionId });
  return response.data.data;
};

const McqSolver = ({ question, isGuest = false }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!selectedOption || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      setResult(await gradeAnswer(question, selectedOption, isGuest));
    } catch (err) {
      // The selection is kept so the answer can be resubmitted as-is.
      setError(`Could not check your answer. ${readApiError(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const submitted = !!result;
  const passed = Boolean(result?.passed ?? result?.correct);
  const explanationFor = new Map((result?.explanations || []).map(e => [e.id, e.explanation]));

  return (
    <Container>
      <QuestionTitle>{question.title}</QuestionTitle>
      {question.difficulty && (
        <DifficultyBadge $difficulty={question.difficulty}>{question.difficulty}</DifficultyBadge>
      )}
      <Description>{question.description}</Description>

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
                <Link to="/login">Sign in</Link> to save your progress.
              </ProgressNote>
            ) : passed && (
              <ProgressNote>
                {result.progressSaved
                  ? 'Saved to your progress.'
                  : 'Your answer is correct, but it could not be saved to your progress.'}
              </ProgressNote>
            )}
          </ResultBox>
        )}
      </div>
    </Container>
  );
};

export default McqSolver;
