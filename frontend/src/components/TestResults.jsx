import React, { useState } from 'react';
import styled from 'styled-components';
import { formatLiteral, formatValue, labelInputs, statusLabel } from '../utils/testResultFormat.js';

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
  color: ${props => props.passed
    ? props.theme.colors.statusSuccess
    : props.skipped ? props.theme.colors.textSecondary : props.theme.colors.statusError};
  font-weight: 500;
`;

const TestCaseDetails = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  color: ${props => props.theme.colors.text};
`;

const Value = styled.pre`
  margin: 0.25rem 0 0.75rem;
  padding: 0.5rem;
  background-color: ${props => props.theme.colors.background};
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: inherit;
`;

const Label = styled.div`
  font-weight: 600;
`;

const DebugOutput = styled.pre`
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: ${props => props.theme.colors.background};
  border-radius: 4px;
  white-space: pre-wrap;
  font-size: 0.875rem;
`;

const TestResults = ({ results, type, parameterNames = [] }) => {
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
        {results.results.map((result, index) => (
          <Tab
            key={index}
            active={activeTab === index}
            onClick={() => setActiveTab(index)}
            title={statusLabel(result)}
          >
            {result.passed ? '✓' : result.status === 'skipped' ? '–' : '✗'} Test {index + 1}
          </Tab>
        ))}
      </TabList>

      {results.results.map((result, index) => (
        <TestCaseContent key={index} style={{ display: activeTab === index ? 'block' : 'none' }}>
          <TestCaseHeader>
            <TestCaseTitle>{result.hidden ? `Hidden test ${index + 1}` : `Test Case ${index + 1}`}</TestCaseTitle>
            <TestCaseStatus passed={result.passed} skipped={result.status === 'skipped'}>
              {statusLabel(result)}
              {typeof result.runtimeMs === 'number' && result.status !== 'skipped' ? ` · ${result.runtimeMs} ms` : ''}
            </TestCaseStatus>
          </TestCaseHeader>

          {result.hidden ? (
            <TestCaseDetails>
              {result.status === 'skipped'
                ? 'Not run because an earlier test exceeded the time limit.'
                : 'Inputs and expected output for hidden tests are not shown.'}
            </TestCaseDetails>
          ) : (
            <TestCaseDetails>
              {labelInputs(result.testCase ?? [], parameterNames).map(({ name, value }) => (
                <div key={name}>
                  <Label>{name} =</Label>
                  <Value>{value}</Value>
                </div>
              ))}
              {result.status !== 'skipped' && (
                <>
                  <Label>Output</Label>
                  <Value>{result.status === 'passed' || result.status === 'wrong' ? formatValue(result.output) : '—'}</Value>
                </>
              )}
              <Label>Expected</Label>
              <Value>{formatLiteral(result.expectedOutput)}</Value>
            </TestCaseDetails>
          )}

          {result.error && (
            <p style={{ color: 'red', whiteSpace: 'pre-wrap' }}>{result.error}</p>
          )}

          {result.debugOutput && (
            <DebugOutput>
              <strong>Stdout:</strong>
              {'\n'}
              {result.debugOutput}
            </DebugOutput>
          )}
        </TestCaseContent>
      ))}
    </TabsContainer>
  );
};

export default TestResults; 