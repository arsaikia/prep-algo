import React, { useState } from 'react';
import styled from 'styled-components';

const TabsContainer = styled.div`
  margin-top: 1rem;
`;

const TabList = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  margin-bottom: 1rem;
`;

const Tab = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.875rem;
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.text};
  border-bottom: 2px solid ${props => props.active ? props.theme.colors.primary : 'transparent'};
  margin-right: 1rem;
  transition: all 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const TestCaseContent = styled.div`
  padding: 1rem;
  background-color: ${props => props.theme.colors.backgroundSecondary};
  border-radius: 4px;
  margin-bottom: 1rem;
`;

const TestCaseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const TestCaseTitle = styled.h4`
  margin: 0;
  color: ${props => props.theme.colors.text};
`;

const TestCaseStatus = styled.span`
  color: ${props => props.passed ? props.theme.colors.statusSuccess : props.theme.colors.statusError};
  font-weight: 500;
`;

const TestCaseDetails = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  color: ${props => props.theme.colors.text};
`;

const DebugOutput = styled.pre`
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: ${props => props.theme.colors.background};
  border-radius: 4px;
  white-space: pre-wrap;
  font-size: 0.875rem;
`;

const TestResults = ({ results, type }) => {
  const [activeTab, setActiveTab] = useState(0);

  if (!results || !results.results || results.results.length === 0) {
    return null;
  }

  return (
    <TabsContainer>
      <h4>{type === 'example' ? 'Example Test Results' : 'Final Test Results'}</h4>
      <p>
        Passed: {results.summary.passed}/{results.summary.total} (
        {Math.round((results.summary.passed / results.summary.total) * 100)}%)
      </p>

      <TabList>
        {results.results.map((_, index) => (
          <Tab
            key={index}
            active={activeTab === index}
            onClick={() => setActiveTab(index)}
          >
            Test {index + 1}
          </Tab>
        ))}
      </TabList>

      {results.results.map((result, index) => (
        <TestCaseContent key={index} style={{ display: activeTab === index ? 'block' : 'none' }}>
          <TestCaseHeader>
            <TestCaseTitle>Test Case {index + 1}</TestCaseTitle>
            <TestCaseStatus passed={result.passed}>
              {result.passed ? 'Passed' : 'Failed'}
            </TestCaseStatus>
          </TestCaseHeader>

          <TestCaseDetails>
            <p><strong>Input:</strong> {JSON.stringify(result.testCase)}</p>
            <p><strong>Expected:</strong> {JSON.stringify(result.expectedOutput)}</p>
            <p><strong>Output:</strong> {JSON.stringify(result.output)}</p>
          </TestCaseDetails>

          {result.error && (
            <p style={{ color: 'red' }}>Error: {result.error}</p>
          )}

          {result.debugOutput && (
            <DebugOutput>
              <strong>Debug Output:</strong>
              {result.debugOutput}
            </DebugOutput>
          )}
        </TestCaseContent>
      ))}
    </TabsContainer>
  );
};

export default TestResults; 