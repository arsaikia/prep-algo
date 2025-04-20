import React, { useState } from 'react';
import styled from 'styled-components';
import { useTheme } from 'styled-components';
import { Play, Save, Download, Link, Shuffle } from 'react-feather';
import axios from 'axios';
import { useSelector } from 'react-redux';

// Styled components
const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: ${props => props.theme.colors.text};
`;

const Subtitle = styled.p`
  font-size: 1rem;
  margin-bottom: 2rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const EditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const EditorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: ${props => props.theme.colors.backgroundSecondary};
  border-radius: 4px 4px 0 0;
  border: 1px solid ${props => props.theme.colors.border};
  border-bottom: none;
`;

const EditorTitle = styled.h3`
  font-size: 1rem;
  color: ${props => props.theme.colors.text};
`;

const EditorActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: ${props => props.variant === 'primary' ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.variant === 'primary' ? 'white' : props.theme.colors.text};
  border: 1px solid ${props => props.variant === 'primary' ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;

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
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: ${props => props.theme.colors.backgroundSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
`;

const LeetCodeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const LeetCodeTitle = styled.h3`
  font-size: 1rem;
  color: ${props => props.theme.colors.text};
`;

const LeetCodeInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  font-size: 0.875rem;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
`;

const LeetCodeButton = styled(ActionButton)`
  width: 100%;
  justify-content: center;
`;

const RandomButton = styled(ActionButton)`
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const QuestionDescription = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background-color: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  font-size: 0.875rem;
  line-height: 1.5;
  color: ${props => props.theme.colors.text};
  
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

  &:hover {
    background-color: ${props => props.theme.colors.backgroundHover};
  }
`;

const CodeSandbox = () => {
  const theme = useTheme();
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(`// Write your code here
function example() {
  console.log("Hello, World!");
}

example();`);
  const [output, setOutput] = useState('');
  const [leetcodeUrl, setLeetcodeUrl] = useState('');
  const [questionDescription, setQuestionDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState('514e10c7-d284-4651-bf40-cb7b2d4cdae3');
  const [testCases, setTestCases] = useState('');
  const [testResults, setTestResults] = useState(null);

  // Get questions from Redux store
  const allQuestions = useSelector((state) => state.questions.allQuestionsWithoutHistory);

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);

    // Update initial code based on language
    if (newLanguage === 'python') {
      setCode(`# Write your code here
def example():
    print("Hello, World!")

example()`);
    } else {
      setCode(`// Write your code here
function example() {
  console.log("Hello, World!");
}

example();`);
    }
  };

  const selectRandomQuestion = () => {
    // For testing, use a specific question ID
    const testQuestionId = '514e10c7-d284-4651-bf40-cb7b2d4cdae3';

    // Convert questions object to array and find the question
    const questionsArray = Object.values(allQuestions.questions).flat();
    const question = questionsArray.find(q => q._id === testQuestionId);

    if (!question) {
      setError('Test question not found');
      return;
    }

    setSelectedQuestion(question);
    setLeetcodeUrl(`https://leetcode.com/problems/${question.link}`);
    fetchLeetCodeQuestion(`https://leetcode.com/problems/${question.link}`);
  };

  const handleCodeChange = (e) => {
    setCode(e.target.value);
  };

  const runCode = async () => {
    try {
      if (language === 'javascript') {
        // Create a safe environment to run the code
        const safeEval = new Function('console', code);

        // Capture console.log output
        let logs = [];
        const customConsole = {
          log: (...args) => {
            logs.push(args.map(arg =>
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '));
          }
        };

        // Run the code
        safeEval(customConsole);

        // Update output
        setOutput(logs.join('\n'));
      } else {
        // For Python code, we'll need to send it to the backend for execution
        const apiBaseUri = process.env.REACT_APP_API_BASE_URI || 'http://localhost:5000/api/v1';
        const questionId = extractQuestionId(leetcodeUrl);
        if (!questionId) {
          setError('No LeetCode question selected');
          return;
        }
        const response = await axios.post(`${apiBaseUri}/code/execute/python`, {
          code,
          questionId,
          testCases: testCases.split('\n').filter(tc => tc.trim())
        });
        setTestResults(response.data);
        setOutput('Test results are displayed below.');
      }
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    }
  };

  const saveCode = () => {
    // In a real app, this would save to a database or local storage
    localStorage.setItem(`savedCode_${language}`, code);
    alert('Code saved!');
  };

  const downloadCode = () => {
    const extension = language === 'python' ? 'py' : 'js';
    const blob = new Blob([code], { type: `text/${language}` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const extractQuestionId = (url) => {
    // Handle different LeetCode URL formats
    // Format 1: https://leetcode.com/problems/two-sum/
    // Format 2: https://leetcode.com/problems/two-sum/description/
    // Format 3: https://leetcode.com/problems/two-sum/discuss/
    const match = url.match(/leetcode\.com\/problems\/([^\/]+)/);
    return match ? match[1] : null;
  };

  const fetchLeetCodeQuestion = async (url = leetcodeUrl) => {
    if (!url) {
      setError('Please enter a LeetCode URL');
      return;
    }

    const questionId = extractQuestionId(url);
    if (!questionId) {
      setError('Invalid LeetCode URL format');
      return;
    }

    setIsLoading(true);
    setError('');
    setQuestionDescription('');

    try {
      // Use our backend endpoint to fetch question details
      const apiBaseUri = process.env.REACT_APP_API_BASE_URI || 'http://localhost:5000/api/v1';
      console.log('Using API base URI:', apiBaseUri);

      const response = await axios.get(`${apiBaseUri}/leetcode/question/${questionId}`);

      if (!response.data) {
        setError('Question not found');
        return;
      }

      const questionData = response.data;

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
      setTestCases(questionData.examples || '');

      // Update the code editor with a template for the solution based on language
      if (language === 'python') {
        setCode(`"""
LeetCode Problem: ${questionData.title || questionId}
Difficulty: ${questionData.difficulty || 'Unknown'}

${formattedContent.substring(0, 100)}...
"""

def solution(params):
    # Your solution here
    pass

# Test cases
${questionData.examples ? questionData.examples.split('\n').map((testCase, index) => `# Test case ${index + 1}:
print(solution(${testCase}))`).join('\n\n') : 'print(solution())'}
`);
      } else {
        setCode(`/**
 * LeetCode Problem: ${questionData.title || questionId}
 * Difficulty: ${questionData.difficulty || 'Unknown'}
 * 
 * ${formattedContent.substring(0, 100)}...
 */

/**
 * @param {any} params
 * @return {any}
 */
function solution(params) {
    // Your solution here
    
}

// Test cases
${questionData.examples ? questionData.examples.split('\n').map((testCase, index) => `// Test case ${index + 1}:
console.log(solution(${testCase}));`).join('\n\n') : 'console.log(solution());'}
`);
      }
    } catch (err) {
      setError(`Error fetching question: ${err.message}`);
      console.error('Error fetching question:', err);
      console.error('Error details:', err.response ? err.response.data : 'No response data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Title>Code Sandbox</Title>
      <Subtitle>Write, run, and test your code</Subtitle>

      <LeetCodeContainer>
        <LeetCodeHeader>
          <LeetCodeTitle>LeetCode Question</LeetCodeTitle>
        </LeetCodeHeader>

        <RandomButton onClick={selectRandomQuestion}>
          <Shuffle size={16} />
          Get Random Question
        </RandomButton>

        <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
          <p style={{ fontSize: '0.875rem', color: theme.colors.textSecondary }}>
            Question URL (for reference):
          </p>
        </div>

        <LeetCodeInput
          type="text"
          placeholder="Question URL will appear here"
          value={leetcodeUrl}
          readOnly
        />

        {selectedQuestion && (
          <div style={{ marginTop: '1rem' }}>
            <p><strong>Selected Question:</strong> {selectedQuestion.name}</p>
            <p><strong>Difficulty:</strong> {selectedQuestion.difficulty}</p>
          </div>
        )}

        {isLoading && <p>Loading question details...</p>}
        {error && <p style={{ color: theme.colors.error }}>{error}</p>}
        {questionDescription && (
          <QuestionDescription>
            <div dangerouslySetInnerHTML={{ __html: questionDescription }} />
            {testCases && (
              <div style={{ marginTop: '1rem' }}>
                <h4>Test Cases:</h4>
                <pre style={{
                  backgroundColor: theme.colors.backgroundSecondary,
                  padding: '1rem',
                  borderRadius: '4px',
                  overflowX: 'auto'
                }}>
                  {testCases}
                </pre>
              </div>
            )}
          </QuestionDescription>
        )}
      </LeetCodeContainer>

      <EditorContainer>
        <EditorHeader>
          <EditorTitle>
            <LanguageSelector value={language} onChange={handleLanguageChange}>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
            </LanguageSelector>
            {language === 'javascript' ? 'JavaScript Editor' : 'Python Editor'}
          </EditorTitle>
          <EditorActions>
            <ActionButton onClick={runCode}>
              <Play size={16} />
              Run
            </ActionButton>
            <ActionButton onClick={saveCode}>
              <Save size={16} />
              Save
            </ActionButton>
            <ActionButton onClick={downloadCode}>
              <Download size={16} />
              Download
            </ActionButton>
          </EditorActions>
        </EditorHeader>
        <CodeEditor
          value={code}
          onChange={handleCodeChange}
          spellCheck="false"
        />
      </EditorContainer>

      <OutputHeader>
        <OutputTitle>Output</OutputTitle>
      </OutputHeader>
      <OutputContainer>
        {output || 'Run your code to see output here...'}
        {testResults && (
          <div style={{ marginTop: '1rem' }}>
            <h4>Test Results Summary:</h4>
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <span style={{ color: theme.colors.success }}>
                Passed: {testResults.summary.passed}
              </span>
              <span style={{ color: theme.colors.error }}>
                Failed: {testResults.summary.failed}
              </span>
              <span style={{ color: theme.colors.textSecondary }}>
                No Expected Output: {testResults.summary.noExpectedOutput}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {testResults.results.map((result, index) => (
                <div
                  key={index}
                  style={{
                    padding: '1rem',
                    backgroundColor: result.passed === true
                      ? `${theme.colors.success}20`
                      : result.passed === false
                        ? `${theme.colors.error}20`
                        : theme.colors.backgroundSecondary,
                    borderRadius: '4px',
                    border: `1px solid ${result.passed === true
                      ? theme.colors.success
                      : result.passed === false
                        ? theme.colors.error
                        : theme.colors.border
                      }`
                  }}
                >
                  <div><strong>Test Case {index + 1}:</strong> {result.testCase}</div>
                  <div><strong>Output:</strong> {result.output}</div>
                  {result.expectedOutput !== 'No expected output provided' && (
                    <div><strong>Expected:</strong> {result.expectedOutput}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </OutputContainer>
    </Container>
  );
};

export default CodeSandbox; 