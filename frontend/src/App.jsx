import React, { useEffect } from 'react';

import { useCookies } from 'react-cookie';
import {
  useDispatch,
  useSelector,
} from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';

import { getQuestions } from './actions/actions';
import AllRoutes from './AllRoutes';
import CodeSection from './components/CodeSection';
import FullScreenLoader from './components/Loader/FullScreenLoader';
import Navbar from './components/Navbar';
import { Container } from './styles';

function App() {
  const [cookies, setCookie] = useCookies(['userId', 'openTab', 'name']);

  // Get states using useSelector ( state->reducerName )
  const isFetchingQuestions = useSelector((state) => state.questions.isFetchingQuestions);
  const todoQuestions = useSelector((state) => state.questions.todoQuestions);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const userIdInAuthStore = useSelector((state) => state.auth.userId);
  const userNameIdInAuthStore = useSelector((state) => state.auth.firstName);

  const userIdInCookie = cookies.userId;
  const userId = userIdInCookie || userIdInAuthStore;

  const tabCookie = cookies.openTab;

  // Fire actions using dispatch -> fires action -> Watcher saga handles rest
  const dispatch = useDispatch();
  const fetchAllQuestions = (userIdToFetchQuestions) => dispatch(getQuestions(userIdToFetchQuestions));

  // Load all question when the app first loads/ user signs in
  useEffect(() => {
    fetchAllQuestions(userId);
  }, [userId]);

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
  }, [isAuthenticated]);

  /** **************************************************************
   * Handler Functions
  **************************************************************** */
  const allQuestionsProps = {
    tabCookie,
    userId,
  };

  const todoProps = {
    isOpen: true,
    isRecap: true,
    todoQuestions,
    userId,
  };

  /******************************************************************
   * Returns JSX from here
  *******************************************************************/
  if (isFetchingQuestions) {
    return <FullScreenLoader show />;
  }
  return (
    <Router>
      <Navbar />
      <Container width="90%" padding="0 5%">
        <CodeSection />
        <AllRoutes
          allQuestionsProps={allQuestionsProps}
          todoProps={todoProps}
        />
      </Container>
    </Router>
  );
}

export default App;
