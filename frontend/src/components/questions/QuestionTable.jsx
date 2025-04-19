import React from 'react';
import styled from 'styled-components';
import { formatLeetCodeUrl } from '../../utils/questions';

// Styled components
const TableContainer = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background-color: white;
`;

const TableHead = styled.thead`
  background-color: #f5f5f5;
`;

const TableHeaderCell = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-weight: bold;
  color: #333;
`;

const TableRow = styled.tr`
  &:nth-child(odd) {
    background-color: #f9f9f9;
  }

  &:hover {
    background-color: #e3f2fd;
  }
`;

const TableCell = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid #ddd;
`;

const DifficultyCell = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid #ddd;
  font-weight: bold;
  color: ${props => {
    switch (props.difficulty) {
      case 'Easy':
        return '#4caf50'; // green
      case 'Medium':
        return '#ff9800'; // orange
      case 'Hard':
        return '#f44336'; // red
      default:
        return '#757575'; // grey
    }
  }};
`;

const QuestionLink = styled.a`
  text-decoration: none;
  color: inherit;

  &:hover {
    text-decoration: underline;
    color: #1976d2;
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