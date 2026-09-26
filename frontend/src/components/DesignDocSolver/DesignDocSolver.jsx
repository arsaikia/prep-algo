import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 900px;
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
  margin-bottom: 20px;
  background: ${({ difficulty, theme }) =>
    difficulty === 'Easy' ? theme.colors.statusSuccess + '20' :
    difficulty === 'Medium' ? theme.colors.statusWarning + '20' :
    theme.colors.statusError + '20'};
  color: ${({ difficulty, theme }) =>
    difficulty === 'Easy' ? theme.colors.statusSuccess :
    difficulty === 'Medium' ? theme.colors.statusWarning :
    theme.colors.statusError};
`;

const Section = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 8px;
`;

const Scenario = styled.p`
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.7;
  padding: 16px;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border-radius: 8px;
  border-left: 4px solid ${({ theme }) => theme.colors.primary};
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const ListItem = styled.li`
  padding: 8px 12px;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.5;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child { border-bottom: none; }
  &::before { content: '- '; color: ${({ theme }) => theme.colors.primary}; font-weight: 600; }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 300px;
  padding: 16px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
`;

const Button = styled.button`
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover { opacity: 0.9; }
`;

const PrimaryButton = styled(Button)`
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  border: 2px solid ${({ theme }) => theme.colors.primary};
`;

const SampleAnswer = styled.div`
  margin-top: 20px;
  padding: 16px;
  background: ${({ theme }) => theme.colors.statusSuccess + '10'};
  border: 1px solid ${({ theme }) => theme.colors.statusSuccess};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.7;
  white-space: pre-wrap;
`;

const DesignDocSolver = ({ question }) => {
  const [answer, setAnswer] = useState('');
  const [showSample, setShowSample] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const prompt = question.designPrompt || {};

  return (
    <Container>
      <QuestionTitle>{question.title}</QuestionTitle>
      <DifficultyBadge difficulty={question.difficulty}>{question.difficulty}</DifficultyBadge>

      {prompt.scenario && (
        <Section>
          <SectionTitle>Scenario</SectionTitle>
          <Scenario>{prompt.scenario}</Scenario>
        </Section>
      )}

      {prompt.requirements?.length > 0 && (
        <Section>
          <SectionTitle>Requirements</SectionTitle>
          <List>
            {prompt.requirements.map((r, i) => <ListItem key={i}>{r}</ListItem>)}
          </List>
        </Section>
      )}

      {prompt.constraints?.length > 0 && (
        <Section>
          <SectionTitle>Constraints</SectionTitle>
          <List>
            {prompt.constraints.map((c, i) => <ListItem key={i}>{c}</ListItem>)}
          </List>
        </Section>
      )}

      {prompt.evaluationCriteria?.length > 0 && (
        <Section>
          <SectionTitle>Evaluation Criteria</SectionTitle>
          <List>
            {prompt.evaluationCriteria.map((e, i) => <ListItem key={i}>{e}</ListItem>)}
          </List>
        </Section>
      )}

      <Section>
        <SectionTitle>Your Design</SectionTitle>
        <TextArea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Write your system design here. Consider the requirements, constraints, and evaluation criteria above..."
          disabled={submitted}
        />
      </Section>

      <ButtonRow>
        {!submitted ? (
          <PrimaryButton onClick={() => setSubmitted(true)} disabled={!answer.trim()}>
            Mark as Attempted
          </PrimaryButton>
        ) : (
          <PrimaryButton disabled style={{ opacity: 0.7 }}>
            Submitted
          </PrimaryButton>
        )}
        <SecondaryButton onClick={() => setShowSample(!showSample)}>
          {showSample ? 'Hide' : 'Reveal'} Sample Answer
        </SecondaryButton>
      </ButtonRow>

      {showSample && prompt.sampleAnswer && (
        <SampleAnswer>
          <SectionTitle>Sample Answer</SectionTitle>
          {prompt.sampleAnswer}
        </SampleAnswer>
      )}
    </Container>
  );
};

export default DesignDocSolver;
