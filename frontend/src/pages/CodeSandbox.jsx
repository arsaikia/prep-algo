import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTheme } from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, Save, Download, Link, Shuffle, Clock, Star, Code, Terminal, Eye, Settings } from 'react-feather';
import { Timer, Pause, Play as PlayLucide, Square, Zap, Monitor, FileDown, FileText, Shuffle as ShuffleLucide, Code2, Terminal as TerminalLucide, Eye as EyeLucide, Settings as SettingsLucide } from 'lucide-react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import TestResults from '../components/TestResults.jsx';
import { useTimeTracker } from '../utils/timeTracker.js';
import { useTestUser } from '../contexts/TestUserContext';
import { isFeatureEnabled, isDevMode } from '../utils/featureFlags';

// Modern styled components with clean design
const Container = styled.div`
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px 12px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  min-height: 100vh;
  
  @media (min-width: 768px) {
    padding: 20px 16px;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`;

const TitleText = styled.span`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.brand.primary}, ${({ theme }) => theme.colors.brand.secondary || theme.colors.brand.primary}dd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 2rem;
  font-size: 1.1rem;
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 2fr 3fr;
  gap: 1rem;
  margin-top: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  @media (min-width: 768px) {
    gap: 1.5rem;
  }
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 20px;
  box-shadow: ${({ theme }) => theme.colors.shadows.card};
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: ${({ theme }) => theme.colors.shadows.cardHover};
    transform: translateY(-1px);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const QuestionCard = styled(Card)`
  margin-bottom: 2rem;
`;

const QuestionHeader = styled(CardHeader)`
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
`;

const QuestionInputSection = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1;
`;

const QuestionInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.brand.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.brand.primary}20;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const ModernButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  background: ${props => props.variant === 'primary'
    ? `linear-gradient(135deg, ${props.theme.colors.brand.primary}, ${props.theme.colors.brand.secondary || props.theme.colors.brand.primary}dd)`
    : props.variant === 'success'
      ? `linear-gradient(135deg, #28a745, #20c997)`
      : props.variant === 'danger'
        ? `linear-gradient(135deg, #dc3545, #e83e8c)`
        : props.theme.colors.background
  };
  color: ${props => props.variant === 'primary' || props.variant === 'success' || props.variant === 'danger'
    ? '#ffffff'
    : props.theme.colors.text
  };
  border: ${props => props.variant === 'primary' || props.variant === 'success' || props.variant === 'danger'
    ? 'none'
    : `2px solid ${props.theme.colors.border}`
  };
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  position: relative;
  overflow: hidden;

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => props.variant === 'primary' || props.variant === 'success' || props.variant === 'danger'
    ? 'rgba(255, 255, 255, 0.1)'
    : `linear-gradient(135deg, ${props.theme.colors.brand.primary}10, ${props.theme.colors.brand.secondary || props.theme.colors.brand.primary}05)`
  };
    opacity: 0;
    transition: opacity 0.3s ease;
    border-radius: 8px;
  }

  &:hover:before {
    opacity: 1;
  }

  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: ${props => props.variant === 'primary'
    ? `0 12px 30px ${props.theme.colors.brand.primary}50`
    : props.variant === 'success'
      ? `0 12px 30px #28a74550`
      : props.variant === 'danger'
        ? `0 12px 30px #dc354550`
        : `0 6px 20px ${props.theme.colors.brand.primary}25`
  };
  }

  &:active {
    transform: translateY(-1px) scale(1.01);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  &:disabled:hover {
    transform: none;
    box-shadow: none;
  }
`;

const QuickTestSection = styled.div`
  margin-top: 16px;
  padding: 16px;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
`;

const QuickTestTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const QuickTestGrid = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const QuickTestButton = styled.button`
  padding: 6px 12px;
  font-size: 12px;
  background: ${props => props.isActive ? props.theme.colors.brand.primary : 'transparent'};
  color: ${props => props.isActive ? '#ffffff' : props.theme.colors.text};
  border: 1px solid ${props => props.isActive ? props.theme.colors.brand.primary : props.theme.colors.border};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${props => props.isActive ? props.theme.colors.brand.primary : props.theme.colors.backgroundHover};
    border-color: ${({ theme }) => theme.colors.brand.primary};
  }
`;

const TimerCard = styled.div`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.brand.primary}12, ${({ theme }) => theme.colors.brand.secondary || theme.colors.brand.primary}06);
  border: 1px solid ${({ theme }) => theme.colors.brand.primary}30;
  border-radius: 16px;
  padding: 16px 24px;
  margin-bottom: 1.5rem;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, ${({ theme }) => theme.colors.brand.primary}15, transparent);
    animation: shimmer 4s infinite;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, ${({ theme }) => theme.colors.brand.primary}, ${({ theme }) => theme.colors.brand.secondary || theme.colors.brand.primary});
    border-radius: 2px;
  }
  
  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }
  
  &:hover {
    transform: translateY(-1px);
    border-color: ${({ theme }) => theme.colors.brand.primary}50;
    box-shadow: 0 4px 20px ${({ theme }) => theme.colors.brand.primary}20;
  }
`;

const TimerContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
`;

const TimerDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
`;

const TimerTime = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 1.3rem;
  font-weight: 600;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.brand.primary}, ${({ theme }) => theme.colors.brand.secondary || theme.colors.brand.primary}dd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
`;

const TimerInfo = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  white-space: nowrap;
`;

const TimerControls = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

const TimerIcon = styled(Timer)`
  color: ${({ theme }) => theme.colors.brand.primary};
  animation: tick 1.5s ease-in-out infinite alternate;
  filter: drop-shadow(0 0 6px ${({ theme }) => theme.colors.brand.primary}50);
  margin-right: 8px;
  
  @keyframes tick {
    0% { 
      transform: scale(1) rotate(-3deg);
      filter: drop-shadow(0 0 6px ${({ theme }) => theme.colors.brand.primary}50);
    }
    100% { 
      transform: scale(1.1) rotate(3deg);
      filter: drop-shadow(0 0 10px ${({ theme }) => theme.colors.brand.primary}70);
    }
  }
`;

const TimerButton = styled(ModernButton)`
  padding: 6px 12px;
  font-size: 12px;
  min-width: 70px;
  height: 32px;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.3s ease, height 0.3s ease;
  }
  
  &:hover::after {
    width: 60px;
    height: 60px;
  }
  
  &:active {
    transform: translateY(0) scale(0.96);
  }
`;

const SessionFeedbackCard = styled(Card)`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.background}, ${({ theme }) => theme.colors.backgroundSecondary});
`;

const FeedbackContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const RatingSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const RatingLabel = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
`;

const RatingButtons = styled.div`
  display: flex;
  gap: 6px;
`;

const RatingButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  font-size: 12px;
  background: ${props => props.selected ? props.theme.colors.brand.primary : 'transparent'};
  color: ${props => props.selected ? '#ffffff' : props.theme.colors.textSecondary};
  border: 1px solid ${props => props.selected ? props.theme.colors.brand.primary : props.theme.colors.border};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.selected ? props.theme.colors.brand.primary : props.theme.colors.backgroundHover};
    border-color: ${({ theme }) => theme.colors.brand.primary};
  }
`;

const TagsSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const TagsGrid = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const TagButton = styled.button`
  padding: 4px 10px;
  font-size: 11px;
  background: ${props => props.selected ? '#28a745' : 'transparent'};
  color: ${props => props.selected ? '#ffffff' : props.theme.colors.textSecondary};
  border: 1px solid ${props => props.selected ? '#28a745' : props.theme.colors.border};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${props => props.selected ? '#28a745' : props.theme.colors.backgroundHover};
    border-color: #28a745;
  }
`;

const EditorCard = styled(Card)`
  height: 600px;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  
  @media (max-width: 1024px) {
    height: 500px;
  }
`;

const EditorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  flex-shrink: 0;
`;

const EditorActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

const LanguageSelector = styled.select`
  padding: 8px 12px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.brand.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.brand.primary}20;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.backgroundHover};
  }
`;

const EditorContainer = styled.div`
  flex: 1;
  min-height: 0;
  background: ${({ theme }) => theme.colors.background};
`;

const OutputCard = styled(Card)`
  min-height: 300px;
  display: flex;
  flex-direction: column;
`;

const OutputContent = styled.div`
  flex: 1;
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text};
  white-space: pre-wrap;
  overflow-y: auto;
  max-height: 400px;
`;

const QuestionDescription = styled(Card)`
  height: 500px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
  
  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
    background: ${({ theme }) => theme.colors.background};
    padding: 12px;
    border-radius: 6px;
    margin: 12px 0;
    border: 1px solid ${({ theme }) => theme.colors.border};
  }
  
  code {
    font-family: 'Fira Code', monospace;
    background: ${({ theme }) => theme.colors.background};
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid ${({ theme }) => theme.colors.border};
  }
  
  p {
    margin: 12px 0;
  }
  
  ul, ol {
    margin: 12px 0;
    padding-left: 24px;
  }
`;

const ErrorAlert = styled.div`
  padding: 16px;
  background: linear-gradient(135deg, #dc354510, #e83e8c10);
  border: 2px solid #dc354530;
  border-radius: 8px;
  color: #dc3545;
  margin: 16px 0;
  font-weight: 500;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${({ theme }) => theme.colors.border};
  border-top: 3px solid ${({ theme }) => theme.colors.brand.primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Modal components
const SessionFeedbackModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  padding: 30px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: ${({ theme }) => theme.colors.shadows.modal || '0 25px 50px rgba(0, 0, 0, 0.3)'};
`;

const ModalTitle = styled.h3`
  margin-bottom: 24px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
`;

const SessionSummary = styled.div`
  background: ${({ theme }) => theme.colors.background};
  padding: 20px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: 24px;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  
  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const CodeSandbox = () => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedUserId } = useTestUser();
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

  // Determine which user to use based on authentication state
  const getEffectiveUser = () => {
    // DEV MODE OVERRIDE: When dev mode is active and a test user is selected,
    // prioritize the test user over the authenticated user. This allows developers
    // to test different user scenarios even when they're logged in.
    if (isDevMode() && selectedUserId) {
      return {
        userId: selectedUserId,
        firstName: 'Test',
        lastName: 'User',
        isAuthenticated: true,
        picture: null
      };
    }

    // AUTHENTICATED USER: Use the real user's data when they're properly logged in
    if (userFromRedux.isAuthenticated && userFromRedux.userId && userFromRedux.userId !== 'guest') {
      return {
        userId: userFromRedux.id || userFromRedux.userId, // Handle the ID field issue
        firstName: userFromRedux.firstName,
        lastName: userFromRedux.lastName,
        isAuthenticated: true,
        picture: userFromRedux.picture
      };
    }

    // LOGIN BUG FALLBACK: Handle edge case where userId is "guest" but 
    // we have the actual user ID in the 'id' field (from auth reducer bug)
    if (userFromRedux.isAuthenticated && userFromRedux.id) {
      return {
        userId: userFromRedux.id,
        firstName: userFromRedux.firstName,
        lastName: userFromRedux.lastName,
        isAuthenticated: true,
        picture: userFromRedux.picture
      };
    }

    // GUEST FALLBACK: Return guest user object for unauthenticated sessions
    return {
      userId: 'guest',
      firstName: 'Guest',
      lastName: '',
      isAuthenticated: false,
      picture: null
    };
  };

  const user = getEffectiveUser();

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
      // Timer paused
    }
  };

  const resume = () => {
    if (isPaused && pauseStartTime) {
      const pauseDuration = Date.now() - pauseStartTime;
      setPausedTime(prev => prev + pauseDuration);
      setIsPaused(false);
      setPauseStartTime(null);
      originalResume(); // Also resume the original tracker
      // Timer resumed
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
        // Timer update
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
    // Get the current theme state from Redux
    const { isDarkModeEnabled } = useSelector(state => state.theme);

    // Return Monaco Editor theme based on current app theme
    return isDarkModeEnabled ? 'vs-dark' : 'vs';
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
      // Using configured API base URI

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
      // API Base URI configuration
      const questionId = leetcodeUrl.replace(/\/$/, ''); // Remove trailing slash if present

      const fullUrl = `${apiBaseUri}/code/execute/example`;
      // Making API request to fetch question details

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


      {isDevMode() && (
        <QuestionCard>
          <QuestionHeader>
            <CardTitle>
              <Code size={20} />
              Load Question
            </CardTitle>
          </QuestionHeader>
          <QuestionInputSection>
            <QuestionInput
              type="text"
              value={leetcodeUrl}
              onChange={(e) => setLeetcodeUrl(e.target.value)}
              placeholder="Enter LeetCode question URL or ID"
            />
            <ModernButton variant="primary" onClick={() => fetchLeetCodeQuestion()}>
              <Link size={16} />
              Load Question
            </ModernButton>
          </QuestionInputSection>

          <QuickTestSection>
            <QuickTestTitle>
              🚀 Quick Test Questions
            </QuickTestTitle>
            <QuickTestGrid>
              {[
                { id: 'two-sum', name: 'Two Sum', difficulty: 'Easy' },
                { id: 'add-two-numbers', name: 'Add Two Numbers', difficulty: 'Medium' },
                { id: 'longest-substring-without-repeating-characters', name: 'Longest Substring', difficulty: 'Medium' },
                { id: 'median-of-two-sorted-arrays', name: 'Median Arrays', difficulty: 'Hard' },
                { id: 'reverse-integer', name: 'Reverse Integer', difficulty: 'Medium' }
              ].map(q => (
                <QuickTestButton
                  key={q.id}
                  isActive={leetcodeUrl === q.id}
                  onClick={() => {
                    setLeetcodeUrl(q.id);
                    fetchLeetCodeQuestion(q.id);
                  }}
                >
                  {q.name} <span style={{ opacity: 0.7 }}>({q.difficulty})</span>
                </QuickTestButton>
              ))}
            </QuickTestGrid>
          </QuickTestSection>
        </QuestionCard>
      )}

      {/* Enhanced Timer Display with QuestionSolver Features */}
      {currentQuestion && user.userId && user.userId !== 'guest' && (
        <TimerCard>
          <TimerContent>
            <TimerDisplay>
              <TimerTime>
                <TimerIcon size={22} />
                {formatTime(displayTime)} {isPaused && '(PAUSED)'}
              </TimerTime>
            </TimerDisplay>
            <TimerControls>
              <TimerButton onClick={pause} disabled={!isTracking || isPaused}>
                <Pause size={12} style={{ marginRight: '4px' }} />
                Pause
              </TimerButton>
              <TimerButton onClick={resume} disabled={!isTracking || !isPaused}>
                <PlayLucide size={12} style={{ marginRight: '4px' }} />
                Resume
              </TimerButton>
              <TimerButton
                variant="danger"
                onClick={() => handleSessionComplete(false)}
                disabled={!isTracking}
              >
                <Square size={12} style={{ marginRight: '4px' }} />
                Give Up
              </TimerButton>
            </TimerControls>
          </TimerContent>
        </TimerCard>
      )}

      {/* User Debug Info */}
      {isLoading && (
        <LoadingState>
          <LoadingSpinner />
          <p>Loading question details...</p>
        </LoadingState>
      )}

      {error && (
        <ErrorAlert>
          {error}
        </ErrorAlert>
      )}

      <MainContent>
        <Panel>
          {questionDescription && (
            <QuestionDescription>
              <CardHeader>
                <CardTitle>
                  <EyeLucide size={20} />
                  Question Description
                </CardTitle>
              </CardHeader>
              <div dangerouslySetInnerHTML={{ __html: questionDescription }} />
            </QuestionDescription>
          )}
        </Panel>

        <Panel>
          <EditorCard>
            <EditorHeader>
              <CardTitle>
                <Code2 size={20} />
                Code Editor
              </CardTitle>
              <EditorActions>
                <LanguageSelector value={language} onChange={handleLanguageChange}>
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                </LanguageSelector>
                <ModernButton onClick={runExampleTests} disabled={isLoading || isRunningExampleTests}>
                  <PlayLucide size={16} style={{ marginRight: '6px' }} />
                  {isRunningExampleTests ? 'Running Examples...' : 'Run Example Tests'}
                </ModernButton>
                <ModernButton onClick={runCode} disabled={isLoading || isRunningExampleTests} variant="primary">
                  <Zap size={16} style={{ marginRight: '6px' }} />
                  {isLoading ? 'Running...' : 'Submit Code'}
                </ModernButton>
              </EditorActions>
            </EditorHeader>
            <EditorContainer>
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
          </EditorCard>

          <OutputCard>
            <CardHeader>
              <CardTitle>
                <Monitor size={20} />
                Output & Results
              </CardTitle>
            </CardHeader>
            <OutputContent>
              {error && <div style={{ color: '#dc3545', fontWeight: 'bold' }}>{error}</div>}
              {debugOutput && <div style={{ color: '#28a745', fontWeight: 'bold' }}>{debugOutput}</div>}
              {output && <div>{output}</div>}

              {exampleTestResults && (
                <TestResults results={exampleTestResults} type="example" />
              )}

              {testResults && (
                <TestResults results={testResults} type="final" />
              )}
            </OutputContent>
          </OutputCard>
        </Panel>
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

            <ModalActions>
              <ModernButton
                onClick={() => {
                  setShowFeedbackModal(false);
                  // Don't reset data, keep for potential re-submission
                }}
                style={{ flex: 1 }}
              >
                💾 Save & Continue Coding
              </ModernButton>
              <ModernButton
                variant="primary"
                onClick={async () => {
                  // Send updated session data with final difficulty rating and tags
                  try {
                    if (currentQuestion && user.userId && user.userId !== 'guest') {


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
                        // Session data sent successfully
                      } else {
                        // Failed to send session data
                      }
                    }
                  } catch (error) {
                    // Error sending session data
                  }

                  setShowFeedbackModal(false);
                  // Reset for next session
                  setSessionDifficultyRating(null);
                  setSelectedTags([]);

                }}
                style={{ flex: 1 }}
              >
                ✅ Complete Session
              </ModernButton>
            </ModalActions>
          </ModalContent>
        </SessionFeedbackModal>
      )}
    </Container>
  );
};

export default CodeSandbox; 