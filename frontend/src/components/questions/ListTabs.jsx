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
  background-color: ${props => props.isActive ? props.theme.colors.brand.primary : props.theme.colors.backgroundSecondary};
  color: ${props => props.isActive ? '#ffffff' : props.theme.colors.text};
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s;
  border: 1px solid ${props => props.isActive ? props.theme.colors.brand.primary : props.theme.colors.border};

  &:hover {
    background-color: ${props => props.isActive ? props.theme.colors.brand.primary : props.theme.colors.backgroundHover};
    border-color: ${props => props.isActive ? props.theme.colors.brand.primary : props.theme.colors.brand.primary};
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