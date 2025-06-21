import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Play } from 'react-feather';
import { formatLeetCodeUrl } from '../../utils/questions';

// Styled components
const TableContainer = styled.div`
  overflow-x: auto;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background-color: ${props => props.theme.colors.white};
`;

const TableHead = styled.thead`
  background-color: ${props => props.theme.colors.background};
`;

const TableHeaderCell = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  border-bottom: 2px solid ${props => props.theme.colors.border};
`;

const TableRow = styled.tr`
  &:nth-child(odd) {
    background-color: ${props => props.theme.colors.background};
  }

  &:hover {
    background-color: ${props => props.theme.colors.hover};
  }
`;

const TableCell = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
`;

const DifficultyCell = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  font-weight: 600;
  color: ${props => {
    switch (props.difficulty) {
      case 'Easy':
        return props.theme.colors.success;
      case 'Medium':
        return props.theme.colors.warning;
      case 'Hard':
        return props.theme.colors.error;
      default:
        return props.theme.colors.text;
    }
  }};
`;

const QuestionContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const QuestionLink = styled.a`
  text-decoration: none;
  color: inherit;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
    color: ${props => props.theme.colors.primary};
  }
`;

const SolveIcon = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: ${props => props.theme.colors.primary};
  transition: all 0.2s ease;
  opacity: 0.7;

  &:hover {
    background-color: ${props => props.theme.colors.primary};
    color: white;
    opacity: 1;
    transform: scale(1.1);
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
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>#</TableHeaderCell>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Difficulty</TableHeaderCell>
          </tr>
        </TableHead>
        <tbody>
          {questions.map((question, index) => {
            const available = isQuestionAvailable(question);

            return (
              <TableRow key={question._id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <QuestionContainer>
                    <QuestionLink
                      href={formatLeetCodeUrl(question)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {question.name}
                    </QuestionLink>
                    {available && (
                      <SolveIcon
                        onClick={(e) => {
                          e.preventDefault();
                          handleSolveClick(question);
                        }}
                        title="Solve this question"
                      >
                        <Play size={14} />
                      </SolveIcon>
                    )}
                  </QuestionContainer>
                </TableCell>
                <DifficultyCell difficulty={question.difficulty}>
                  {question.difficulty}
                </DifficultyCell>
              </TableRow>
            );
          })}
        </tbody>
      </Table>
    </TableContainer>
  );
};

export default QuestionTable; 