import React, { Suspense, lazy, useEffect } from 'react';

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
import styled from 'styled-components';

import {
  getAllQuestionsWithoutHistory,
  getQuestions,
  resetAuthState,
  fetchUserInfo,
} from './actions/actions';
import AllRoutes from './AllRoutes';
import FullScreenLoader from './components/Loader/FullScreenLoader';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Container } from './styles';
import { createTheme } from './theme';
import useTheme from './hooks/useTheme';
import { TestUserProvider } from './contexts/TestUserContext';

// CodeSection is a modal that stays closed until the user asks to view code.
// Loading it lazily keeps its syntax-highlighting dependency off the critical path.
const CodeSection = lazy(() => import('./components/CodeSection'));

// App wrapper with theme background
const AppWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  transition: all 0.3s ease;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

// Wrapper component to access location
function AppContent() {
  const location = useLocation();
  // Pages that render their own loading state; the global spinner would
  // double up. System Design's reader (/system-design/:slug) manages its own
  // fetch too, so match the whole subtree rather than the index alone.
  const isAllQuestionsPage = ['/all', '/questions', '/algorithms', '/frontend'].includes(location.pathname)
    || location.pathname.startsWith('/system-design');
  const isLoginPage = location.pathname === '/login';
  const { isDarkModeEnabled, colorScheme } = useTheme();

  // Get states using useSelector ( state->reducerName )
  const isFetchingQuestions = useSelector((state) => state.questions.isFetchingQuestions);
  // Mount the code modal only once something wants to show it, so its chunk is
  // never downloaded during an ordinary visit.
  const needsCodeModal = useSelector(
    (state) => state.codeModal.showCodeModal || state.codeModal.showLoading,
  );

  // Update body background color based on theme and color scheme
  useEffect(() => {
    const theme = createTheme(isDarkModeEnabled ? 'dark' : 'light', colorScheme);
    const backgroundColor = theme.colors.background;

    // Set CSS custom properties for theme colors
    document.documentElement.style.setProperty('--theme-background', backgroundColor);
    document.documentElement.style.setProperty('--gradient-full-refresh', theme.colors.gradientFullRefresh);
    document.body.style.backgroundColor = backgroundColor;

    // Cleanup function to reset on unmount (though this component rarely unmounts)
    return () => {
      document.documentElement.style.removeProperty('--theme-background');
      document.documentElement.style.removeProperty('--gradient-full-refresh');
      document.body.style.backgroundColor = '';
    };
  }, [isDarkModeEnabled, colorScheme]);

  // Only show loading indicator if we're not on the AllQuestions page or Login page
  if (isFetchingQuestions && !isAllQuestionsPage && !isLoginPage) {
    return <FullScreenLoader show />;
  }

  const currentTheme = createTheme(isDarkModeEnabled ? 'dark' : 'light', colorScheme);

  return (
    <ThemeProvider theme={currentTheme}>
      <AppWrapper>
        <MainContent>
          <Navbar />
          <Container width="calc(100% - 2rem)" padding="0 1rem">
            <Suspense fallback={null}>
              {needsCodeModal && <CodeSection />}
            </Suspense>
            <AllRoutes />
          </Container>
        </MainContent>
        <Footer />
      </AppWrapper>
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

  // Fetch questions immediately when this component mounts
  useEffect(() => {
    if (!hasFetchedRef.current) {
      // Always fetch questions without solve history
      dispatch(getAllQuestionsWithoutHistory());
      hasFetchedRef.current = true;
    }
  }, [dispatch]);

  useEffect(() => {
    if (userId !== 'guest' && !hasFetchedUserRef.current) {
      dispatch(fetchUserInfo(userId));
      hasFetchedUserRef.current = true;
    }
  }, [dispatch, userId]);

  return children;
}

function App() {
  const [cookies, setCookie, removeCookie] = useCookies(['userId', 'openTab', 'name', 'authToken']);
  const dispatch = useDispatch();

  // Get states using useSelector ( state->reducerName )
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const userIdInAuthStore = useSelector((state) => state.auth.userId);
  const userNameIdInAuthStore = useSelector((state) => state.auth.firstName);
  const { isDarkModeEnabled } = useTheme();
  const authToken = useSelector((state) => state.auth.token);

  const userIdInCookie = cookies.userId;
  const userId = userIdInCookie || userIdInAuthStore || 'guest';

  // Log feature flags on app startup
  useEffect(() => {
    // Feature flags initialization (no logging)
  }, []);

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
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <TestUserProvider>
        <Router>
          <QuestionsLoader>
            <AppContent />
          </QuestionsLoader>
        </Router>
      </TestUserProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
