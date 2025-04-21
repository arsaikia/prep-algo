import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTheme } from 'styled-components';
import { Play, Save, Download, Link, Shuffle } from 'react-feather';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import TestResults from '../components/TestResults';

// Styled components
const Container = styled.div`
  padding: 1rem;
  max-width: 1400px;
  margin: 0 auto;

  @media (min-width: 768px) {
    padding: 2rem;
  }
`;

const Title = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: ${props => props.theme.colors.text};

  @media (min-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  margin-bottom: 1rem;
  color: ${props => props.theme.colors.textSecondary};

  @media (min-width: 768px) {
    font-size: 1rem;
    margin-bottom: 2rem;
  }
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;

  @media (min-width: 1024px) {
    flex-direction: row;
    gap: 2rem;
    margin-top: 2rem;
  }
`;

const LeftPanel = styled.div`
  flex: 1;
  min-width: 0;
  order: 1;
`;

const RightPanel = styled.div`
  flex: 1;
  min-width: 0;
  order: 2;
`;

const EditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
  height: 400px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  overflow: hidden;

  @media (min-width: 768px) {
    height: 500px;
    margin-bottom: 2rem;
  }
`;

const EditorHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: ${props => props.theme.colors.backgroundSecondary};
  border-radius: 4px 4px 0 0;
  border: 1px solid ${props => props.theme.colors.border};
  border-bottom: none;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
  }
`;

const EditorTitle = styled.h3`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text};

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

const EditorActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;

  @media (min-width: 768px) {
    flex-wrap: nowrap;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: ${props => props.variant === 'primary' ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.variant === 'primary' ? 'white' : props.theme.colors.text};
  border: 1px solid ${props => props.variant === 'primary' ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s ease;
  white-space: nowrap;

  @media (min-width: 768px) {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  &:hover {
    background-color: ${props => props.variant === 'primary' ? props.theme.colors.primaryDark : props.theme.colors.backgroundHover};
  }
`;

const CodeEditor = styled.textarea`
  width: 100%;
  height: 400px;
  padding: 1rem;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  background-color: ${props => props.theme.colors.backgroundSecondary};
  color: ${props => props.theme.colors.text};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 0 0 4px 4px;
  resize: vertical;
`;

const OutputContainer = styled.div`
  padding: 1rem;
  background-color: ${props => props.theme.colors.backgroundSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  min-height: 200px;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  color: ${props => props.theme.colors.text};
  white-space: pre-wrap;
`;

const OutputHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const OutputTitle = styled.h3`
  font-size: 1rem;
  color: ${props => props.theme.colors.text};
`;

const LeetCodeContainer = styled.div`
  margin-bottom: 1rem;
  padding: 1rem;
  background-color: ${props => props.theme.colors.backgroundSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;

  @media (min-width: 768px) {
    margin-bottom: 2rem;
  }
`;

const LeetCodeHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

const LeetCodeTitle = styled.h3`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text};

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

const LeetCodeInput = styled.input`
  flex: 1;
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  font-size: 0.875rem;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
`;

const LeetCodeButton = styled(ActionButton)`
  width: auto;
  white-space: nowrap;
`;

const InputContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const RandomButton = styled(ActionButton)`
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const QuestionDescription = styled.div`
  padding: 1rem;
  background-color: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  height: 400px;
  overflow-y: auto;
  font-size: 0.875rem;
  line-height: 1.5;
  color: ${props => props.theme.colors.text};
  
  @media (min-width: 768px) {
    height: calc(100vh - 300px);
    font-size: 0.875rem;
  }
  
  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
    background-color: ${props => props.theme.colors.backgroundSecondary};
    padding: 0.5rem;
    border-radius: 4px;
    margin: 0.5rem 0;
  }
  
  code {
    font-family: 'Fira Code', monospace;
    background-color: ${props => props.theme.colors.backgroundSecondary};
    padding: 0.2rem 0.4rem;
    border-radius: 2px;
  }
  
  p {
    margin: 0.5rem 0;
  }
  
  ul, ol {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }
`;

const LanguageSelector = styled.select`
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: 0.875rem;
  cursor: pointer;
  margin-right: 1rem;
  width: 100%;

  @media (min-width: 768px) {
    width: auto;
  }

  &:hover {
    background-color: ${props => props.theme.colors.backgroundHover};
  }
`;

const CodeSandbox = () => {
  const theme = useTheme();
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [leetcodeUrl, setLeetcodeUrl] = useState('rotting-oranges');
  const [questionDescription, setQuestionDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isRunningExampleTests, setIsRunningExampleTests] = useState(false);
  const [exampleTestResults, setExampleTestResults] = useState(null);
  const [debugOutput, setDebugOutput] = useState('');

  // Get questions from Redux store
  const allQuestions = useSelector((state) => state.questions.allQuestionsWithoutHistory);

  const getDefaultTemplate = (language, question) => {
    // If the question has a specific template, use it
    if (question?.templates?.[language]) {
      return question.templates[language];
    }

    // Generate a method name based on the question
    let methodName = 'solution';
    if (question?.name) {
      // Convert question name to camelCase for method name
      methodName = question.name
        .toLowerCase()
        .replace(/[^a-z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
        .replace(/^[A-Z]/, c => c.toLowerCase());
    }

    if (language === 'python') {
      return `class Solution:
    def ${methodName}(self, *args):
        """
        Write your solution here.
        """
        pass`;
    }

    return `class Solution {
    ${methodName}(...args) {
        // Write your solution here
    }
}`;
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    if (currentQuestion) {
      setCode(getDefaultTemplate(newLanguage, currentQuestion));
    }
  };

  const handleEditorChange = (value) => {
    setCode(value);
  };

  const getEditorLanguage = () => {
    return language === 'python' ? 'python' : 'javascript';
  };

  const getEditorTheme = () => {
    return theme.darkMode ? 'vs-dark' : 'light';
  };

  const runCode = async () => {
    try {
      setIsLoading(true);
      setError('');
      setOutput('');
      setTestResults(null);

      const apiBaseUri = process.env.REACT_APP_API_BASE_URI || 'http://localhost:5000/api/v1';
      const questionId = leetcodeUrl.replace(/\/$/, ''); // Remove trailing slash if present

      // Submit code to the backend
      const response = await axios.post(`${apiBaseUri}/questions/${questionId}/submit`, {
        code
      });

      // Format the results for display
      if (response.data) {
        const formattedResults = {
          summary: {
            passed: response.data.passedTests,
            failed: response.data.totalTests - response.data.passedTests,
            total: response.data.totalTests,
            score: response.data.score
          },
          results: response.data.results.map(r => ({
            testCase: r.input,
            output: r.result,
            expectedOutput: r.expected,
            passed: r.passed,
            error: r.error,
            debugOutput: r.debugOutput
          }))
        };

        setTestResults(formattedResults);
        setOutput(`Test results: ${response.data.passedTests}/${response.data.totalTests} tests passed (${response.data.score}% score)`);
      } else {
        setError('Invalid response format from server');
      }
    } catch (error) {
      setError(`Error: ${error.response?.data?.message || error.message}`);
      console.error('Error executing code:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCode = () => {
    // In a real app, this would save to a database or local storage
    localStorage.setItem(`savedCode_${language}_${leetcodeUrl}`, code);
    alert('Code saved!');
  };

  const downloadCode = () => {
    const extension = language === 'python' ? 'py' : 'js';
    const blob = new Blob([code], { type: `text/${language}` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${leetcodeUrl}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fetchLeetCodeQuestion = async () => {
    setIsLoading(true);
    setError('');
    setQuestionDescription('');
    setCode('');
    setTestResults(null);

    const questionId = leetcodeUrl.replace(/\/$/, ''); // Remove trailing slash if present

    try {
      // Use our backend endpoint to fetch question details
      const apiBaseUri = process.env.REACT_APP_API_BASE_URI || 'http://localhost:5000/api/v1';
      console.log('Using API base URI:', apiBaseUri);

      const response = await axios.get(`${apiBaseUri}/questions/${questionId}`);

      if (!response.data) {
        setError('Question not found');
        return;
      }

      const questionData = response.data;
      setCurrentQuestion(questionData);

      // Check if description exists
      if (!questionData.description) {
        setError('Question description not available');
        return;
      }

      // Format the content for display
      const formattedContent = questionData.description
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\t/g, '\t');

      setQuestionDescription(formattedContent);

      // Set the template based on the current language
      const template = questionData.templates?.[language] || getDefaultTemplate(language, null);
      setCode(template);

      // Try to load saved code for this question and language
      const savedCode = localStorage.getItem(`savedCode_${language}_${questionId}`);
      if (savedCode) {
        setCode(savedCode);
      }
    } catch (err) {
      setError(`Error fetching question: ${err.message}`);
      console.error('Error fetching question:', err);
      console.error('Error details:', err.response ? err.response.data : 'No response data');
    } finally {
      setIsLoading(false);
    }
  };

  const runExampleTests = async () => {
    try {
      setIsRunningExampleTests(true);
      setError('');
      setDebugOutput('');
      setExampleTestResults(null);

      const apiBaseUri = process.env.REACT_APP_API_BASE_URI || 'http://localhost:5000/api/v1';
      const questionId = leetcodeUrl.replace(/\/$/, ''); // Remove trailing slash if present

      // Submit code to the backend for example test cases
      const response = await axios.post(`${apiBaseUri}/code/execute/example`, {
        code,
        questionId
      });

      // Format the results for display
      if (response.data) {
        const formattedResults = {
          summary: {
            passed: response.data.summary.passed,
            failed: response.data.summary.failed,
            total: response.data.summary.total
          },
          results: response.data.results.map(r => ({
            testCase: r.input,
            output: r.actualOutput,
            expectedOutput: r.expectedOutput,
            passed: r.isCorrect,
            error: r.error,
            debugOutput: r.debugOutput
          }))
        };

        setExampleTestResults(formattedResults);
        setDebugOutput(`Example test results: ${response.data.summary.passed}/${response.data.summary.total} tests passed`);
      } else {
        setError('Invalid response format from server');
      }
    } catch (error) {
      setError(`Error: ${error.response?.data?.message || error.message}`);
      console.error('Error executing example tests:', error);
    } finally {
      setIsRunningExampleTests(false);
    }
  };

  // Initialize with default template and fetch the default question
  useEffect(() => {
    fetchLeetCodeQuestion();
  }, []);

  // Update code when language changes
  useEffect(() => {
    if (currentQuestion) {
      setCode(getDefaultTemplate(language, currentQuestion));
    }
  }, [language, currentQuestion]);

  return (
    <Container>
      <Title>Code Sandbox</Title>
      <Subtitle>Write, run, and test your code</Subtitle>

      <LeetCodeContainer>
        <LeetCodeHeader>
          <LeetCodeTitle>Question</LeetCodeTitle>
        </LeetCodeHeader>
        <InputContainer>
          <LeetCodeInput
            type="text"
            value={leetcodeUrl}
            onChange={(e) => setLeetcodeUrl(e.target.value)}
            placeholder="Enter LeetCode question URL or ID"
          />
          <LeetCodeButton onClick={() => fetchLeetCodeQuestion()}>
            Load Question
          </LeetCodeButton>
        </InputContainer>
      </LeetCodeContainer>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading question details...</p>
        </div>
      )}

      {error && (
        <div style={{ color: 'red', padding: '1rem', margin: '1rem', backgroundColor: '#ffebee', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <MainContent>
        <LeftPanel>
          {questionDescription && (
            <QuestionDescription>
              <div dangerouslySetInnerHTML={{ __html: questionDescription }} />
            </QuestionDescription>
          )}
        </LeftPanel>

        <RightPanel>
          <EditorContainer>
            <EditorHeader>
              <EditorTitle>Code Editor</EditorTitle>
              <EditorActions>
                <LanguageSelector value={language} onChange={handleLanguageChange}>
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                </LanguageSelector>
                <ActionButton onClick={runExampleTests} disabled={isLoading || isRunningExampleTests}>
                  <Play size={16} />
                  {isRunningExampleTests ? 'Running Examples...' : 'Run Example Tests'}
                </ActionButton>
                <ActionButton onClick={runCode} disabled={isLoading || isRunningExampleTests} variant="primary">
                  <Play size={16} />
                  {isLoading ? 'Running...' : 'Submit Code'}
                </ActionButton>
              </EditorActions>
            </EditorHeader>
            <Editor
              height="100%"
              defaultLanguage={getEditorLanguage()}
              language={getEditorLanguage()}
              theme={getEditorTheme()}
              value={code}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                readOnly: false,
                automaticLayout: true,
              }}
            />
          </EditorContainer>

          <OutputContainer>
            <OutputHeader>
              <OutputTitle>Output</OutputTitle>
            </OutputHeader>
            {error && <div style={{ color: 'red' }}>{error}</div>}
            {debugOutput && <div>{debugOutput}</div>}
            {output && <div>{output}</div>}

            {exampleTestResults && (
              <TestResults results={exampleTestResults} type="example" />
            )}

            {testResults && (
              <TestResults results={testResults} type="final" />
            )}
          </OutputContainer>
        </RightPanel>
      </MainContent>
    </Container>
  );
};

export default CodeSandbox; 