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
    background: #f1f1f1;
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 2px;
  }
`;

const Tab = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  background-color: ${props => props.isActive ? '#1976d2' : '#e0e0e0'};
  color: ${props => props.isActive ? 'white' : '#333'};
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    background-color: ${props => props.isActive ? '#1565c0' : '#d5d5d5'};
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