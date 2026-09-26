import React, { useState } from 'react';
import styled from 'styled-components';
import apiClient from '../../api/client.js';

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
  background: ${({ difficulty, theme }) =>
    difficulty === 'Easy' ? theme.colors.statusSuccess + '20' :
    difficulty === 'Medium' ? theme.colors.statusWarning + '20' :
    theme.colors.statusError + '20'};
  color: ${({ difficulty, theme }) =>
    difficulty === 'Easy' ? theme.colors.statusSuccess :
    difficulty === 'Medium' ? theme.colors.statusWarning :
    theme.colors.statusError};
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 24px;
  line-height: 1.6;
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
  border: 2px solid ${({ theme, selected, correct, incorrect }) =>
    correct ? theme.colors.statusSuccess :
    incorrect ? theme.colors.statusError :
    selected ? theme.colors.primary :
    theme.colors.border};
  border-radius: 8px;
  cursor: ${({ disabled }) => disabled ? 'default' : 'pointer'};
  background: ${({ theme, correct, incorrect }) =>
    correct ? theme.colors.statusSuccess + '10' :
    incorrect ? theme.colors.statusError + '10' :
    theme.colors.backgroundSecondary};
  transition: all 0.2s;

  &:hover {
    ${({ disabled, theme }) => !disabled && `border-color: ${theme.colors.primary};`}
  }

  input {
    margin-top: 3px;
  }
`;

const OptionText = styled.span`
  color: ${({ theme }) => theme.colors.text};
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
  background: ${({ correct, theme }) =>
    correct ? theme.colors.statusSuccess + '15' : theme.colors.statusError + '15'};
  border: 1px solid ${({ correct, theme }) =>
    correct ? theme.colors.statusSuccess : theme.colors.statusError};
`;

const ResultTitle = styled.div`
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 8px;
  color: ${({ correct, theme }) =>
    correct ? theme.colors.statusSuccess : theme.colors.statusError};
`;

const Explanation = styled.p`
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.6;
`;

const McqSolver = ({ question }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedOption) return;
    setSubmitting(true);
    try {
      const response = await apiClient.post(
        `/questions/${question.id}/submit-mcq`,
        { selectedOptionId: selectedOption }
      );
      setResult(response.data.data);
    } catch (err) {
      console.error('MCQ submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const submitted = !!result;

  return (
    <Container>
      <QuestionTitle>{question.title}</QuestionTitle>
      <DifficultyBadge difficulty={question.difficulty}>{question.difficulty}</DifficultyBadge>
      <Description>{question.description}</Description>

      <OptionsContainer>
        {question.mcqOptions?.map(opt => (
          <Option
            key={opt.id}
            selected={selectedOption === opt.id}
            correct={submitted && opt.id === result?.correctOptionId}
            incorrect={submitted && selectedOption === opt.id && !result?.correct}
            disabled={submitted}
          >
            <input
              type="radio"
              name="mcq"
              checked={selectedOption === opt.id}
              onChange={() => !submitted && setSelectedOption(opt.id)}
              disabled={submitted}
            />
            <OptionText>{opt.text}</OptionText>
          </Option>
        ))}
      </OptionsContainer>

      {!submitted && (
        <SubmitButton onClick={handleSubmit} disabled={!selectedOption || submitting}>
          {submitting ? 'Checking...' : 'Submit Answer'}
        </SubmitButton>
      )}

      {submitted && (
        <ResultBox correct={result.correct}>
          <ResultTitle correct={result.correct}>
            {result.correct ? 'Correct!' : 'Incorrect'}
          </ResultTitle>
          <Explanation>{result.explanation}</Explanation>
        </ResultBox>
      )}
    </Container>
  );
};

export default McqSolver;
