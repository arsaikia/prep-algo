import React from 'react';
import styled from 'styled-components';
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

const QuestionLink = styled.a`
  text-decoration: none;
  color: inherit;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
    color: ${props => props.theme.colors.primary};
  }
`;

const QuestionTable = ({ questions }) => {
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
          {questions.map((question, index) => (
            <TableRow key={question._id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <QuestionLink
                  href={formatLeetCodeUrl(question)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {question.name}
                </QuestionLink>
              </TableCell>
              <DifficultyCell difficulty={question.difficulty}>
                {question.difficulty}
              </DifficultyCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </TableContainer>
  );
};

export default QuestionTable; 