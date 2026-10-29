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
  resetAuthState,
  fetchUserInfo,
} from './actions/actions';
import AllRoutes from './AllRoutes';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Container } from './styles';
import { createTheme } from './theme';
import useTheme from './hooks/useTheme';
import { TestUserProvider } from './contexts/TestUserContext';
import GoogleLoginModal from './components/Auth/GoogleLoginModal';

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

  ${({ $immersive }) => $immersive && `
    height: 100vh;
    max-height: 100vh;
    overflow: hidden;
  `}
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  /*
   * Immersive routes own the viewport: they lay themselves out against a
   * fixed height and scroll internally, so the page itself must not grow a
   * scrollbar around them.
   */
  ${({ $immersive }) => $immersive && `
    min-height: 0;
    overflow: hidden;
  `}
`;

/**
 * Routes that manage their own full-height layout.
 *
 * The default shell centres content in a padded container and always renders
 * a footer, which is right for a document-shaped page and wrong for an
 * application-shaped one. A resizable editor split or a two-pane reader has
 * to know its own height, and it cannot if the shell keeps adding chrome
 * below it. These routes opt out of the container and the footer entirely.
 */
const IMMERSIVE_ROUTES = ['/codesandbox', '/system-design'];

function isImmersiveRoute(pathname) {
    return IMMERSIVE_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
}

// Wrapper component to access location
function AppContent() {
  const location = useLocation();
  const [signInOpen, setSignInOpen] = React.useState(false);
  const signInIntent = React.useRef(null);
  useEffect(() => {
    signInIntent.current = null;
    setSignInOpen(false);
  }, [location.key]);
  useEffect(() => {
    const open = (event) => {
      signInIntent.current = event.detail?.onSuccess || null;
      setSignInOpen(true);
    };
    window.addEventListener('prep:sign-in', open);
    window.addEventListener('prep:auth-expired', open);
    return () => {
      window.removeEventListener('prep:sign-in', open);
      window.removeEventListener('prep:auth-expired', open);
    };
  }, []);
  const { isDarkModeEnabled, colorScheme } = useTheme();

  // Get states using useSelector ( state->reducerName )
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

  const currentTheme = createTheme(isDarkModeEnabled ? 'dark' : 'light', colorScheme);
  const immersive = isImmersiveRoute(location.pathname);

  const routes = (
    <>
      <Suspense fallback={null}>
        {needsCodeModal && <CodeSection />}
      </Suspense>
      <AllRoutes />
    </>
  );

  return (
    <ThemeProvider theme={currentTheme}>
      <AppWrapper $immersive={immersive}>
        <MainContent $immersive={immersive}>
          <Navbar />
          <GoogleLoginModal isOpen={signInOpen}
            onClose={() => { signInIntent.current = null; setSignInOpen(false); }}
            onAuthenticated={() => {
              const intent = signInIntent.current;
              signInIntent.current = null;
              setSignInOpen(false);
              if (intent) queueMicrotask(intent);
            }}
          />
          {immersive ? routes : (
            <Container width="calc(100% - 2rem)" padding="0 1rem">
              {routes}
            </Container>
          )}
        </MainContent>
        {!immersive && <Footer />}
      </AppWrapper>
    </ThemeProvider>
  );
}

// QuestionsLoader component to handle initial data fetching
function QuestionsLoader({ children }) {
  const dispatch = useDispatch();
  const hasFetchedRef = React.useRef(false);

  // Fetch questions immediately when this component mounts
  useEffect(() => {
    if (!hasFetchedRef.current) {
      // Always fetch questions without solve history
      dispatch(getAllQuestionsWithoutHistory());
      hasFetchedRef.current = true;
    }
  }, [dispatch]);

  return children;
}

function App() {
  const [cookies, setCookie, removeCookie] = useCookies(['userId', 'openTab', 'name', 'authToken']);
  const dispatch = useDispatch();

  // Get states using useSelector ( state->reducerName )
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const userIdInAuthStore = useSelector((state) => state.auth.userId);
  const userNameIdInAuthStore = useSelector((state) => state.auth.firstName);
  const authToken = useSelector((state) => state.auth.token);

  const userId = userIdInAuthStore || 'guest';
  const authStatus = useSelector((state) => state.auth.status);

  useEffect(() => {
    if (authStatus !== 'unknown') return;
    if (cookies.userId && cookies.authToken) dispatch(fetchUserInfo(cookies.userId));
    else dispatch({ type: 'AUTH_GUEST' });
  }, [authStatus, cookies.userId, cookies.authToken, dispatch]);

  useEffect(() => {
    const expired = () => dispatch({ type: 'AUTH_EXPIRED' });
    window.addEventListener('prep:auth-expired', expired);
    return () => window.removeEventListener('prep:auth-expired', expired);
  }, [dispatch]);

  useEffect(() => {
    if (authStatus !== 'guest') return;
    ['userId', 'name', 'authToken'].forEach((key) => removeCookie(key, { path: '/' }));
  }, [authStatus, removeCookie]);

  // Set cookie when user logs in
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Set secure cookie options
    const cookieOptions = {
      path: '/',
      secure: window.location.protocol === 'https:',
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
    if (!isAuthenticated) return undefined;
    let lastActivity = Date.now();
    const expire = () => {
      ['userId', 'name', 'authToken'].forEach((key) => removeCookie(key, { path: '/' }));
      dispatch(resetAuthState());
    };
    const activity = () => {
      if (Date.now() - lastActivity >= 30 * 60 * 1000) expire();
      else lastActivity = Date.now();
    };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, activity, { passive: true, capture: true }));
    const sessionTimeout = setInterval(() => {
      if (Date.now() - lastActivity >= 30 * 60 * 1000) {
        expire();
      }
    }, 10000);
    return () => {
      clearInterval(sessionTimeout);
      events.forEach((event) => window.removeEventListener(event, activity, true));
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
