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
      <Container width="90%" padding="0 5%">
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

  // Fetch questions immediately when this component mounts
  useEffect(() => {
    // Always fetch questions without solve history
    dispatch(getAllQuestionsWithoutHistory());
  }, [dispatch]);

  return children;
}

function App() {
  const [cookies, setCookie] = useCookies(['userId', 'openTab', 'name']);

  // Get states using useSelector ( state->reducerName )
  const todoQuestions = useSelector((state) => state.questions.todoQuestions);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const userIdInAuthStore = useSelector((state) => state.auth.userId);
  const userNameIdInAuthStore = useSelector((state) => state.auth.firstName);
  const isDarkMode = useSelector((state) => state.theme.isDarkModeEnabled);

  const userIdInCookie = cookies.userId;
  const userId = userIdInCookie || userIdInAuthStore || 'guest';

  // Set cookie when user logs in
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    setCookie('userId', userId, {
      path: '/',
    });
    setCookie('name', userNameIdInAuthStore, {
      path: '/',
    });
  }, [isAuthenticated, userId, userNameIdInAuthStore, setCookie]);

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
