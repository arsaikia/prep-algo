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
    ? props.theme.colors.difficultyEasy + '08'  // Very subtle green background tint
    : props.theme.colors.background
  };
      border: 2px solid ${props => props.theme.colors.border};
  border-radius: 12px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
      box-shadow: ${props => props.theme.colors.shadowCard};
  position: relative;
  
  &:hover {
          border-color: ${props => props.theme.colors.primary};
          box-shadow: ${props => props.theme.colors.shadowCard};
    transform: translateY(-2px);
  }
`;

const SolvedIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${props => props.theme.colors.difficultyEasy};
  font-size: 12px;
  font-weight: 600;
  background: ${props => props.theme.colors.difficultyEasy}15;
  padding: 4px 8px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.colors.difficultyEasy}30;
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
    ? props.theme.colors.difficultyEasy + '20'
    : props.theme.colors.backgroundTertiary
  };
  color: ${props => props.solved
    ? props.theme.colors.difficultyEasy
    : props.theme.colors.text
  };
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
  border: ${props => props.solved
    ? `2px solid ${props.theme.colors.difficultyEasy}40`
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
        return props.theme.colors.difficultyEasy;
      case 'Medium':
        return props.theme.colors.difficultyMedium;
      case 'Hard':
        return props.theme.colors.difficultyHard;
      default:
        return props.theme.colors.difficultyUnknown;
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
  color: ${props => props.theme.colors.primary};
  font-weight: 500;
  font-size: 14px;
  padding: 6px 12px;
  border: 1px solid ${props => props.theme.colors.primary};
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.primary};
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
  background-color: ${props => props.theme.colors.primary};
  color: #ffffff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.secondary};
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const SmartReasonBadge = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
  margin-top: 4px;
`;

const PriorityIndicator = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    switch (props.priority) {
      case 'high': return '#ff4757';
      case 'medium': return '#ffa502';
      case 'low': return '#2ed573';
      default: return '#747d8c';
    }
  }};
  margin-left: 8px;
`;

const MarkCompleteButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #2ed573;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #26d0ce;
    transform: scale(1.05);
  }
`;

const QuestionTable = ({
  questions,
  showHeaders = false,
  showProgress = false,
  onQuestionCompleted = null,
  isSmartMode = false
}) => {
  const navigate = useNavigate();

  const handleSolveClick = (question) => {
    // Navigate to Code Sandbox with the question link as a parameter
    navigate(`/codesandbox?question=${question.link}`);
  };

  const handleMarkComplete = (question) => {
    if (onQuestionCompleted) {
      onQuestionCompleted(question._id || question.id, {
        timeSpent: 0, // Could be tracked in the future
        success: true
      });
    }
  };

  const isQuestionAvailable = (question) => {
    // Check if the question has test cases (either regular or example test cases)
    return question.availableForSolve === true;
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
                <QuestionName>
                  {question.name}
                  {isSmartMode && question.priority && (
                    <PriorityIndicator priority={question.priority} />
                  )}
                </QuestionName>
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
                {isSmartMode && question.reason && (
                  <SmartReasonBadge>{question.reason}</SmartReasonBadge>
                )}
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
                {isSmartMode && onQuestionCompleted && (
                  <MarkCompleteButton
                    onClick={(e) => {
                      e.preventDefault();
                      handleMarkComplete(question);
                    }}
                    title="Mark as completed"
                  >
                    <CheckCircle size={12} />
                    Done
                  </MarkCompleteButton>
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