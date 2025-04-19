import React from 'react';
import styled from 'styled-components';
import QuestionTable from './QuestionTable';

// Styled components
const GroupContainer = styled.div`
  margin-bottom: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background-color: white;
`;

const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem;
  cursor: pointer;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #e3f2fd;
  }
`;

const GroupTitle = styled.h3`
  margin: 0;
  font-size: 1.2rem;
  color: #333;
`;

const QuestionCount = styled.span`
  margin-left: 0.5rem;
  font-size: 0.9rem;
  color: #666;
  opacity: 0.7;
`;

const QuestionGroup = ({ groupName, questions, isExpanded, onToggle }) => {
  return (
    <GroupContainer>
      <GroupHeader onClick={() => onToggle(groupName)}>
        <GroupTitle>{groupName}</GroupTitle>
        <QuestionCount>({questions.length} questions)</QuestionCount>
      </GroupHeader>
      {isExpanded && <QuestionTable questions={questions} />}
    </GroupContainer>
  );
};

export default QuestionGroup; 