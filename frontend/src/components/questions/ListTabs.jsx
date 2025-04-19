import React from 'react';
import styled from 'styled-components';

// Styled components
const TabsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.background};
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.border};
    border-radius: 2px;
  }
`;

const Tab = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  background-color: ${props => props.isActive ? props.theme.colors.primary : props.theme.colors.background};
  color: ${props => props.isActive ? props.theme.colors.white : props.theme.colors.text};
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    background-color: ${props => props.isActive ? props.theme.colors.primaryDark : props.theme.colors.border};
  }
`;

const ListTabs = ({ listNamesAndCounts, activeList, onTabChange }) => {
  return (
    <TabsContainer>
      {listNamesAndCounts.map(({ name, count }) => (
        <Tab
          key={name}
          isActive={activeList === name}
          onClick={() => onTabChange(name)}
        >
          {name} ({count})
        </Tab>
      ))}
    </TabsContainer>
  );
};

export default ListTabs; 