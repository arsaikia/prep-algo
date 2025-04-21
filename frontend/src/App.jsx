import React, { useEffect } from 'react';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { useCookies } from 'react-cookie';
import {
  useDispatch,
  useSelector,
} from 'react-redux';
import {
  BrowserRouter as Router,
  useLocation,
} from 'react-router-dom';
import { ThemeProvider } from 'styled-components';

import {
  getAllQuestionsWithoutHistory,
  getQuestions,
  resetAuthState,
  fetchUserInfo,
} from './actions/actions';
import AllRoutes from './AllRoutes';
import CodeSection from './components/CodeSection';
import FullScreenLoader from './components/Loader/FullScreenLoader';
import Navbar from './components/Navbar';
import { Container } from './styles';
import { lightTheme, darkTheme } from './theme';

// Wrapper component to access location
function AppContent() {
  const location = useLocation();
  const isAllQuestionsPage = location.pathname === '/all' || location.pathname === '/questions';
  const isLoginPage = location.pathname === '/login';
  const isDarkMode = useSelector((state) => state.theme.isDarkModeEnabled);

  // Get states using useSelector ( state->reducerName )
  const isFetchingQuestions = useSelector((state) => state.questions.isFetchingQuestions);

  // Only show loading indicator if we're not on the AllQuestions page or Login page
  if (isFetchingQuestions && !isAllQuestionsPage && !isLoginPage) {
    return <FullScreenLoader show />;
  }

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <Navbar />
      <Container width="calc(100% - 2rem)" padding="0 1rem">
        <CodeSection />
        <AllRoutes />
      </Container>
    </ThemeProvider>
  );
}

// QuestionsLoader component to handle initial data fetching
function QuestionsLoader({ children }) {
  const dispatch = useDispatch();
  const [cookies] = useCookies(['userId']);
  const userIdInCookie = cookies.userId;
  const userId = userIdInCookie || 'guest';
  const hasFetchedRef = React.useRef(false);
  const hasFetchedUserRef = React.useRef(false);

  console.log('QuestionsLoader mounted with userId:', userId);
  console.log('Cookies:', cookies);

  // Fetch questions immediately when this component mounts
  useEffect(() => {
    if (!hasFetchedRef.current) {
      console.log('Dispatching getAllQuestionsWithoutHistory');
      // Always fetch questions without solve history
      dispatch(getAllQuestionsWithoutHistory());
      hasFetchedRef.current = true;
    }
  }, [dispatch]);

  useEffect(() => {
    console.log('Checking userId for fetchUserInfo:', userId);
    if (userId !== 'guest' && !hasFetchedUserRef.current) {
      console.log('Dispatching fetchUserInfo with userId:', userId);
      dispatch(fetchUserInfo(userId));
      hasFetchedUserRef.current = true;
    } else if (userId === 'guest') {
      console.log('Not dispatching fetchUserInfo because userId is guest');
    }
  }, [dispatch, userId]);

  return children;
}

function App() {
  const [cookies, setCookie, removeCookie] = useCookies(['userId', 'openTab', 'name', 'authToken']);
  const dispatch = useDispatch();

  // Get states using useSelector ( state->reducerName )
  const todoQuestions = useSelector((state) => state.questions.todoQuestions);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const userIdInAuthStore = useSelector((state) => state.auth.userId);
  const userNameIdInAuthStore = useSelector((state) => state.auth.firstName);
  const isDarkMode = useSelector((state) => state.theme.isDarkModeEnabled);
  const authToken = useSelector((state) => state.auth.token);

  const userIdInCookie = cookies.userId;
  const userId = userIdInCookie || userIdInAuthStore || 'guest';

  // Set cookie when user logs in
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Set secure cookie options
    const cookieOptions = {
      path: '/',
      secure: true, // Only send over HTTPS
      sameSite: 'strict', // Prevent CSRF attacks
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    };

    setCookie('userId', userId, cookieOptions);
    setCookie('name', userNameIdInAuthStore, cookieOptions);

    // Store JWT token if available
    if (authToken) {
      setCookie('authToken', authToken, cookieOptions);
    }
  }, [isAuthenticated, userId, userNameIdInAuthStore, setCookie, authToken]);

  // Check for session timeout
  useEffect(() => {
    let sessionTimeout;

    if (isAuthenticated) {
      // Set session timeout to 30 minutes of inactivity
      sessionTimeout = setTimeout(() => {
        // Clear all auth cookies
        removeCookie('userId');
        removeCookie('name');
        removeCookie('authToken');

        // Dispatch reset auth action
        dispatch(resetAuthState());
      }, 30 * 60 * 1000); // 30 minutes
    }

    return () => {
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
    };
  }, [isAuthenticated, removeCookie, dispatch]);

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
        <Router>
          <QuestionsLoader>
            <AppContent />
          </QuestionsLoader>
        </Router>
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}

export default App;
