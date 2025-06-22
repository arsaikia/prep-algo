import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Play, CheckCircle } from 'react-feather';
import { formatLeetCodeUrl } from '../../utils/questions';

// Styled components - Updated to match home page card design
const TableContainer = styled.div`
  display: grid;
  gap: 12px;
  margin-bottom: 2rem;
  padding: 16px;
`;

const QuestionCard = styled.div`
  background: ${props => props.solved
    ? props.theme.colors.difficulty.easy + '08'  // Very subtle green background tint
    : props.theme.colors.recommendations.cardBackground
  };
  border: 2px solid ${props => props.theme.colors.recommendations.cardBorder};
  border-radius: 12px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${props => props.theme.colors.recommendations.cardShadow};
  position: relative;
  
  &:hover {
    border-color: ${props => props.theme.colors.recommendations.cardBorderHover};
    box-shadow: ${props => props.theme.colors.recommendations.cardShadowHover};
    transform: translateY(-2px);
  }
`;

const SolvedIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${props => props.theme.colors.difficulty.easy};
  font-size: 12px;
  font-weight: 600;
  background: ${props => props.theme.colors.difficulty.easy}15;
  padding: 4px 8px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.colors.difficulty.easy}30;
`;

const QuestionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
`;

const QuestionNumber = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.solved
    ? props.theme.colors.difficulty.easy + '20'
    : props.theme.colors.backgroundTertiary
  };
  color: ${props => props.solved
    ? props.theme.colors.difficulty.easy
    : props.theme.colors.text
  };
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
  border: ${props => props.solved
    ? `2px solid ${props.theme.colors.difficulty.easy}40`
    : 'none'
  };
  position: relative;
`;

const QuestionInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const QuestionName = styled.h4`
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  line-height: 1.3;
`;

const QuestionMeta = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const DifficultyBadge = styled.span`
  font-weight: 600;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 12px;
  background: ${props => props.theme.colors.backgroundTertiary};
  border: 1px solid ${props => props.theme.colors.border};
  
  color: ${props => {
    switch (props.difficulty) {
      case 'Easy':
        return props.theme.colors.difficulty.easy;
      case 'Medium':
        return props.theme.colors.difficulty.medium;
      case 'Hard':
        return props.theme.colors.difficulty.hard;
      default:
        return props.theme.colors.difficulty.unknown;
    }
  }};
`;

const QuestionActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const QuestionLink = styled.a`
  text-decoration: none;
  color: ${props => props.theme.colors.brand.primary};
  font-weight: 500;
  font-size: 14px;
  padding: 6px 12px;
  border: 1px solid ${props => props.theme.colors.brand.primary};
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.brand.primary};
    color: #ffffff;
    text-decoration: none;
  }
`;

const SolveButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: ${props => props.theme.colors.brand.primary};
  color: #ffffff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.brand.secondary};
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const QuestionTable = ({ questions }) => {
  const navigate = useNavigate();

  const handleSolveClick = (question) => {
    // Navigate to Code Sandbox with the question link as a parameter
    navigate(`/codesandbox?question=${question.link}`);
  };

  const isQuestionAvailable = (question) => {
    // For now, we'll consider a question available if it can be found in our database
    // In the future, we can add more sophisticated checks based on whether the question
    // has description, test cases, and templates when we fetch individual question details

    // You can add specific question links that you know have full data
    const availableQuestions = [
      'rotting-oranges',
      'two-sum',
      'valid-anagram',
      // Add more question links here as they become available
    ];

    // Remove trailing slash for comparison
    const questionLink = question.link.replace(/\/$/, '');
    return availableQuestions.includes(questionLink);
  };

  return (
    <TableContainer>
      {questions.map((question, index) => {
        const available = isQuestionAvailable(question);

        return (
          <QuestionCard key={question._id} solved={question.solved}>
            <QuestionHeader>
              <QuestionNumber solved={question.solved}>
                {index + 1}
              </QuestionNumber>
              <QuestionInfo>
                <QuestionName>{question.name}</QuestionName>
                <QuestionMeta>
                  <DifficultyBadge difficulty={question.difficulty}>
                    {question.difficulty}
                  </DifficultyBadge>
                  {question.solved && (
                    <SolvedIndicator>
                      <CheckCircle size={16} />
                    </SolvedIndicator>
                  )}
                </QuestionMeta>
              </QuestionInfo>
              <QuestionActions>
                <QuestionLink
                  href={formatLeetCodeUrl(question)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Problem
                </QuestionLink>
                {available && (
                  <SolveButton
                    onClick={(e) => {
                      e.preventDefault();
                      handleSolveClick(question);
                    }}
                    title="Solve this question"
                  >
                    <Play size={14} />
                    Solve
                  </SolveButton>
                )}
              </QuestionActions>
            </QuestionHeader>
          </QuestionCard>
        );
      })}
    </TableContainer>
  );
};

export default QuestionTable; 