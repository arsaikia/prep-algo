import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTheme } from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, Save, Download, Link, Shuffle, Clock, Star } from 'react-feather';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import TestResults from '../components/TestResults';
import { useTimeTracker } from '../utils/timeTracker';

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

// Add new styled components for time tracking
const TimerContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background-color: ${props => props.theme.colors.backgroundSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }
`;

const TimerDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Fira Code', monospace;
  font-size: 1.1rem;
  font-weight: bold;
  color: ${props => props.theme.colors.primary};
`;

const TimerControls = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const TimerButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background-color: transparent;
  color: ${props => props.theme.colors.text};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.backgroundHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SessionFeedbackModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: ${props => props.theme.colors.background};
  padding: 2rem;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h3`
  margin-bottom: 1rem;
  color: ${props => props.theme.colors.text};
`;

const RatingSection = styled.div`
  margin-bottom: 1.5rem;
`;

const RatingLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: ${props => props.theme.colors.text};
  font-weight: 500;
`;

const RatingButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const RatingButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background-color: ${props => props.selected ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.selected ? 'white' : props.theme.colors.text};
  border: 1px solid ${props => props.selected ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.selected ? props.theme.colors.primaryDark : props.theme.colors.backgroundHover};
  }
`;

const TagsSection = styled.div`
  margin-bottom: 1.5rem;
`;

const TagsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const TagButton = styled.button`
  padding: 0.4rem 0.8rem;
  font-size: 0.75rem;
  background-color: ${props => props.selected ? props.theme.colors.success : 'transparent'};
  color: ${props => props.selected ? 'white' : props.theme.colors.text};
  border: 1px solid ${props => props.selected ? props.theme.colors.success : props.theme.colors.border};
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.selected ? props.theme.colors.successDark : props.theme.colors.backgroundHover};
  }
`;

const SessionSummary = styled.div`
  background-color: ${props => props.theme.colors.backgroundSecondary};
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const CodeSandbox = () => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [leetcodeUrl, setLeetcodeUrl] = useState('');
  const [questionDescription, setQuestionDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isRunningExampleTests, setIsRunningExampleTests] = useState(false);
  const [exampleTestResults, setExampleTestResults] = useState(null);
  const [debugOutput, setDebugOutput] = useState('');

  // Time tracking states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [sessionDifficultyRating, setSessionDifficultyRating] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [displayTime, setDisplayTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedTime, setPausedTime] = useState(0);
  const [pauseStartTime, setPauseStartTime] = useState(null);

  // Get user data from Redux store, but override with test user for development
  const userFromRedux = useSelector((state) => state.auth);
  const allQuestions = useSelector((state) => state.questions.allQuestionsWithoutHistory);

  // TEST USER - Always signed in for development/testing
  const testUser = {
    userId: 'test-user-123',
    firstName: 'Test',
    lastName: 'User',
    isAuthenticated: true,
    picture: null
  };

  // Use test user instead of actual user for now
  const user = testUser; // Change back to userFromRedux when ready for production

  // Initialize time tracker
  const {
    currentTime,
    isTracking,
    startTracking,
    stopTracking,
    pause: originalPause,
    resume: originalResume,
    addTags,
    setDifficultyRating: setTrackerDifficulty
  } = useTimeTracker();

  // Custom pause/resume functions
  const pause = () => {
    if (!isPaused && isTracking) {
      setIsPaused(true);
      setPauseStartTime(Date.now());
      originalPause(); // Also pause the original tracker
      console.log('⏸️ Timer paused');
    }
  };

  const resume = () => {
    if (isPaused && pauseStartTime) {
      const pauseDuration = Date.now() - pauseStartTime;
      setPausedTime(prev => prev + pauseDuration);
      setIsPaused(false);
      setPauseStartTime(null);
      originalResume(); // Also resume the original tracker
      console.log('▶️ Timer resumed');
    }
  };

  // Direct timer update effect
  useEffect(() => {
    let interval;
    if (isTracking && timerStartTime && !isPaused) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsedMinutes = (now - timerStartTime - pausedTime) / (1000 * 60);
        setDisplayTime(Math.max(0, elapsedMinutes));
        console.log('⏱️ Timer update:', elapsedMinutes); // Debug log
      }, 1000); // Update every second
    }
    return () => clearInterval(interval);
  }, [isTracking, timerStartTime, isPaused, pausedTime]);

  // Available tags for categorizing sessions
  const availableTags = [
    'array', 'string', 'tree', 'graph', 'dynamic-programming',
    'binary-search', 'sorting', 'hash-table', 'two-pointers',
    'sliding-window', 'backtracking', 'greedy', 'math',
    'struggled', 'easy-solve', 'multiple-attempts', 'learned-new-concept'
  ];

  // Format time display
  const formatTime = (minutes) => {
    if (minutes < 1) {
      const seconds = Math.floor(minutes * 60);
      return `${seconds}s`;
    }
    const mins = Math.floor(minutes);
    const secs = Math.floor((minutes % 1) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start tracking when a question is loaded
  useEffect(() => {
    if (currentQuestion && user.userId && user.userId !== 'guest') {
      startTracking(currentQuestion.id, user.userId);
      setTimerStartTime(Date.now()); // Set our direct timer start time
      setDisplayTime(0);
      setIsPaused(false);
      setPausedTime(0);
      setPauseStartTime(null);
    }
  }, [currentQuestion, user.userId]);

  // Handle session completion
  const handleSessionComplete = async (success = true) => {
    if (!isTracking) return;

    try {
      const sessionData = await stopTracking(success, sessionDifficultyRating, selectedTags);
      console.log('📊 Session completed:', sessionData);
      setShowFeedbackModal(true);
    } catch (error) {
      console.error('❌ Error completing session:', error);
    }
  };

  // Handle difficulty rating change
  const handleDifficultyChange = (rating) => {
    setSessionDifficultyRating(rating);
    setTrackerDifficulty(rating);
  };

  // Handle tag selection
  const handleTagToggle = (tag) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];

    setSelectedTags(newTags);
    addTags(newTags);
  };

  // Check for question parameter in URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const questionParam = urlParams.get('question');

    console.log('URL question parameter:', questionParam);

    if (questionParam) {
      setError(''); // Clear any existing errors
      setLeetcodeUrl(questionParam);
      // Automatically fetch the question
      fetchLeetCodeQuestion(questionParam);
    } else {
      // For testing: Auto-load two-sum if no question specified
      const testQuestion = 'two-sum';
      setLeetcodeUrl(testQuestion);
      fetchLeetCodeQuestion(testQuestion);
    }
  }, [location.search]);

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

        // Handle session completion based on results
        const success = response.data.score >= 70; // Consider 70%+ as success
        if (isTracking && user.userId !== 'guest') {
          await handleSessionComplete(success);
        }
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

  const fetchLeetCodeQuestion = async (questionId = null) => {
    const questionToFetch = questionId || leetcodeUrl;

    if (!questionToFetch || !questionToFetch.trim()) {
      setError('Please enter a question URL or ID');
      return;
    }

    setIsLoading(true);
    setError('');
    setQuestionDescription('');
    setTestResults(null);
    setExampleTestResults(null);
    setDebugOutput('');

    try {
      // Use our backend endpoint to fetch question details
      const apiBaseUri = process.env.REACT_APP_API_BASE_URI || 'http://localhost:5000/api/v1';
      console.log('Using API base URI:', apiBaseUri);

      const response = await axios.get(`${apiBaseUri}/questions/${questionToFetch}`);

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
      const savedCode = localStorage.getItem(`savedCode_${language}_${questionToFetch}`);
      if (savedCode) {
        setCode(savedCode);
      }

      // Update URL without the question parameter to clean it up
      if (questionId) {
        const newUrl = window.location.pathname;
        navigate(newUrl, { replace: true });
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
      console.log('🔍 API Base URI being used:', apiBaseUri);
      console.log('🔍 Environment variable REACT_APP_API_BASE_URI:', process.env.REACT_APP_API_BASE_URI);
      const questionId = leetcodeUrl.replace(/\/$/, ''); // Remove trailing slash if present

      const fullUrl = `${apiBaseUri}/code/execute/example`;
      console.log('🔍 Full URL for request:', fullUrl);

      // Submit code to the backend for example test cases
      const response = await axios.post(fullUrl, {
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
            passed: r.passed,
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

  // Initialize with default template
  useEffect(() => {
    setCode(getDefaultTemplate(language, null));
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

        {/* Quick Test Questions */}
        <div style={{
          marginTop: '12px',
          padding: '8px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '6px', color: '#666' }}>
            🚀 Quick Test Questions:
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'two-sum', name: 'Two Sum', difficulty: 'Easy' },
              { id: 'add-two-numbers', name: 'Add Two Numbers', difficulty: 'Medium' },
              { id: 'longest-substring-without-repeating-characters', name: 'Longest Substring', difficulty: 'Medium' },
              { id: 'median-of-two-sorted-arrays', name: 'Median Arrays', difficulty: 'Hard' },
              { id: 'reverse-integer', name: 'Reverse Integer', difficulty: 'Medium' }
            ].map(q => (
              <button
                key={q.id}
                onClick={() => {
                  setLeetcodeUrl(q.id);
                  fetchLeetCodeQuestion(q.id);
                }}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  backgroundColor: leetcodeUrl === q.id ? '#007bff' : 'white',
                  color: leetcodeUrl === q.id ? 'white' : '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {q.name} <span style={{ opacity: 0.7 }}>({q.difficulty})</span>
              </button>
            ))}
          </div>
        </div>
      </LeetCodeContainer>

      {/* Enhanced Timer Display with QuestionSolver Features */}
      {currentQuestion && user.userId && user.userId !== 'guest' && (
        <TimerContainer>
          <TimerDisplay>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#007bff' }}>
              ⏱️ {formatTime(displayTime)} {isPaused && '(PAUSED)'}
            </span>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>
              Session for: {user.firstName} {user.lastName}
            </span>
          </TimerDisplay>
          <TimerControls>
            <TimerButton onClick={pause} disabled={!isTracking || isPaused}>
              ⏸️ Pause
            </TimerButton>
            <TimerButton onClick={resume} disabled={!isTracking || !isPaused}>
              ▶️ Resume
            </TimerButton>
            <TimerButton
              onClick={() => handleSessionComplete(false)}
              disabled={!isTracking}
              style={{ color: '#dc3545' }}
            >
              ❌ Give Up
            </TimerButton>
          </TimerControls>
        </TimerContainer>
      )}

      {/* Quick Feedback Section - Show during session */}
      {currentQuestion && isTracking && (
        <div style={{
          background: '#f8f9fa',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '1rem',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Quick Rating:</span>
              {[1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  onClick={() => handleDifficultyChange(rating)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    backgroundColor: sessionDifficultyRating === rating ? '#007bff' : 'transparent',
                    color: sessionDifficultyRating === rating ? 'white' : '#666',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {rating}★
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Quick Tags:</span>
              {['struggled', 'easy-solve', 'learned-new-concept'].map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.7rem',
                    backgroundColor: selectedTags.includes(tag) ? '#28a745' : 'transparent',
                    color: selectedTags.includes(tag) ? 'white' : '#666',
                    border: '1px solid #ddd',
                    borderRadius: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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

      {/* Enhanced Session Feedback Modal */}
      {showFeedbackModal && (
        <SessionFeedbackModal>
          <ModalContent>
            <ModalTitle>🎉 Coding Session Complete!</ModalTitle>

            <SessionSummary>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <strong>⏱️ Time Spent:</strong><br />
                  <span style={{ fontSize: '1.2rem', color: '#007bff' }}>{formatTime(displayTime)}</span>
                </div>
                <div>
                  <strong>📝 Question:</strong><br />
                  <span style={{ color: '#666' }}>{currentQuestion?.title || 'Unknown'}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <strong>👤 User:</strong><br />
                  <span style={{ color: '#666' }}>{user.firstName} {user.lastName}</span>
                </div>
                <div>
                  <strong>🎯 Language:</strong><br />
                  <span style={{ color: '#666' }}>{language.charAt(0).toUpperCase() + language.slice(1)}</span>
                </div>
              </div>
            </SessionSummary>

            <RatingSection>
              <RatingLabel>⭐ How difficult was this question for you?</RatingLabel>
              <RatingButtons>
                {[1, 2, 3, 4, 5].map(rating => (
                  <RatingButton
                    key={rating}
                    selected={sessionDifficultyRating === rating}
                    onClick={() => handleDifficultyChange(rating)}
                  >
                    <Star size={16} fill={sessionDifficultyRating === rating ? 'white' : 'none'} />
                    {rating}
                  </RatingButton>
                ))}
              </RatingButtons>
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                1 = Very Easy, 5 = Very Hard
              </div>
            </RatingSection>

            <TagsSection>
              <RatingLabel>🏷️ Session Tags (select all that apply):</RatingLabel>
              <TagsGrid>
                {availableTags.map(tag => (
                  <TagButton
                    key={tag}
                    selected={selectedTags.includes(tag)}
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </TagButton>
                ))}
              </TagsGrid>
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '8px' }}>
                Selected: {selectedTags.length > 0 ? selectedTags.join(', ') : 'None'}
              </div>
            </TagsSection>

            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'space-between',
              marginTop: '2rem',
              padding: '1rem 0',
              borderTop: '1px solid #eee'
            }}>
              <ActionButton
                onClick={() => {
                  setShowFeedbackModal(false);
                  // Don't reset data, keep for potential re-submission
                }}
                style={{ flex: 1 }}
              >
                💾 Save & Continue Coding
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={async () => {
                  // Send updated session data with final difficulty rating and tags
                  try {
                    if (currentQuestion && user.userId && user.userId !== 'guest') {
                      console.log('🎯 Sending updated session data with dialog inputs...');

                      // Create updated session data
                      const updatedSessionData = {
                        userId: user.userId,
                        questionId: currentQuestion.id,
                        timeSpent: displayTime,
                        success: true, // Assume success if they're completing the session
                        difficultyRating: sessionDifficultyRating,
                        tags: selectedTags
                      };

                      // Send to backend
                      const apiBaseUrl = process.env.REACT_APP_API_BASE_URI || 'http://localhost:5000/api/v1';
                      const response = await fetch(`${apiBaseUrl}/solveHistory`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(updatedSessionData)
                      });

                      if (response.ok) {
                        console.log('✅ Updated session data sent successfully');
                      } else {
                        console.error('❌ Failed to send updated session data');
                      }
                    }
                  } catch (error) {
                    console.error('❌ Error sending updated session data:', error);
                  }

                  setShowFeedbackModal(false);
                  // Reset for next session
                  setSessionDifficultyRating(null);
                  setSelectedTags([]);
                  console.log('🎯 Session data saved for recommendations!');
                }}
                style={{ flex: 1 }}
              >
                ✅ Complete Session
              </ActionButton>
            </div>
          </ModalContent>
        </SessionFeedbackModal>
      )}
    </Container>
  );
};

export default CodeSandbox; 