import React, { useState } from 'react';

import styled from 'styled-components';
import { AlertCircle, CheckCircle, HelpCircle, XCircle } from 'react-feather';

import apiClient from '../../api/client.js';

const Wrap = styled.section`
  margin: 3rem 0 0;
  padding: 1.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
`;

const Heading = styled.h3`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
  color: ${({ theme }) => theme.colors.text};
`;

const Prompt = styled.p`
  margin: 0 0 1.15rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text};
`;

const Options = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1.1rem;
`;

const outline = ({ theme, $state }) => {
    if ($state === 'correct') return theme.colors.statusSuccess;
    if ($state === 'wrong') return theme.colors.statusError;
    if ($state === 'selected') return theme.colors.primary;
    return theme.colors.border;
};

const Option = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.8rem 0.9rem;
  border: 2px solid ${outline};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background};
  cursor: ${({ $locked }) => ($locked ? 'default' : 'pointer')};
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text};

  input { margin-top: 0.28rem; flex-shrink: 0; }
`;

const Explanation = styled.p`
  margin: 0.5rem 0 0;
  font-size: 0.86rem;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const SubmitButton = styled.button`
  padding: 0.6rem 1.35rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RetryButton = styled(SubmitButton)`
  background: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  margin-left: 0.6rem;
`;

const Verdict = styled.p`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0 0 1rem;
  font-weight: 600;
  color: ${({ theme, $passed }) => ($passed ? theme.colors.statusSuccess : theme.colors.statusError)};
`;

const ErrorNote = styled.p`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0 0 1rem;
  font-size: 0.88rem;
  color: ${({ theme }) => theme.colors.statusError};
`;

/**
 * A single check-your-understanding question at the end of a topic.
 *
 * Grading goes through the slug-keyed answer key on the server rather than the
 * published body, which carries option text but no correct flag — the same
 * split that keeps hidden test cases off the CDN. Every option's explanation
 * comes back on submit, so a wrong answer teaches why the distractor was
 * tempting instead of only pointing at the right one.
 */
function TopicQuiz({ quiz }) {
    const [selected, setSelected] = useState(null);
    const [result, setResult] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!quiz || !Array.isArray(quiz.options) || quiz.options.length === 0) return null;

    const locked = Boolean(result);

    const submit = async () => {
        if (!selected || submitting) return;
        setSubmitting(true);
        setError(null);
        try {
            const response = await apiClient.post(`/quiz/${quiz.slug}/grade`, {
                selectedOptionId: selected,
            });
            setResult(response.data.data);
        } catch (err) {
            setError(
                err?.response?.data?.message
                || 'Could not check that answer. Check your connection and try again.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const reset = () => {
        setResult(null);
        setSelected(null);
        setError(null);
    };

    const explanationFor = (id) => result?.explanations?.find((e) => e.id === id)?.explanation;

    const stateFor = (id) => {
        if (!result) return selected === id ? 'selected' : 'idle';
        if (id === result.correctOptionId) return 'correct';
        if (id === result.selectedOptionId) return 'wrong';
        return 'idle';
    };

    return (
        <Wrap>
            <Heading>
                <HelpCircle size={17} />
                Check your understanding
            </Heading>
            <Prompt>{quiz.description || quiz.title}</Prompt>

            {result && (
                <Verdict $passed={result.passed}>
                    {result.passed ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {result.passed ? 'Correct' : 'Not quite — see the explanations below'}
                </Verdict>
            )}

            {error && (
                <ErrorNote>
                    <AlertCircle size={15} />
                    {error}
                </ErrorNote>
            )}

            <Options>
                {quiz.options.map((option) => {
                    const explanation = locked ? explanationFor(option.id) : null;
                    return (
                        <Option key={option.id} $state={stateFor(option.id)} $locked={locked}>
                            <input
                                type="radio"
                                name={`quiz-${quiz.slug}`}
                                value={option.id}
                                checked={selected === option.id}
                                disabled={locked}
                                onChange={() => setSelected(option.id)}
                            />
                            <span>
                                {option.text}
                                {explanation && <Explanation>{explanation}</Explanation>}
                            </span>
                        </Option>
                    );
                })}
            </Options>

            {!locked ? (
                <SubmitButton onClick={submit} disabled={!selected || submitting}>
                    {submitting ? 'Checking…' : 'Check answer'}
                </SubmitButton>
            ) : (
                <RetryButton onClick={reset}>Try again</RetryButton>
            )}
        </Wrap>
    );
}

export default TopicQuiz;
