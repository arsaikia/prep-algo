/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable no-unused-vars */
import React from 'react';

import { useCookies } from 'react-cookie';
import {
  useSelector, useDispatch,
} from 'react-redux';
import {
  NavLink, useLocation, useNavigate,
} from 'react-router-dom';

import {
  getQuestions, resetAuthState,
} from '../actions/actions';
import logo from '../logo.png';
import {
  Container, Flex, CenteredFlex, StyledNavLink, BlankButton,
} from '../styles';

function Navbar() {
  const loc = useLocation();
  const navigate = useNavigate();

  const [cookies, setCookie, removeCookie] = useCookies(['userId', 'name']);

  // Get states using useSelector ( state->reducerName )
  // const userAuthState = useSelector((state) => state.auth);

  // Fire actions using dispatch -> fires action -> Watcher saga handles rest
  const dispatch = useDispatch();
  const fetchAllQuestions = (userId) => dispatch(getQuestions(userId));
  const resetAuth = () => dispatch(resetAuthState());

  const userIdInCookie = cookies.userId;
  const {
    name,
  } = cookies;
  const isUserAuthenticated = userIdInCookie;

  /** ****************************************************************************
   * HANDLER FUNCTIONS
  ***************************************************************************** */
  const signOutHandler = () => {
    removeCookie('userId');
    removeCookie('name');
    resetAuth();
    fetchAllQuestions('guest');
    navigate('/');
  };

  return (
    <>
      <CenteredFlex
        width="100%"
        height="8%"
        border="1px solid #dee7f9"
        background="linear-gradient(180deg, rgba(254,254,254,1) 35%, rgba(225,225,225,1) 100%)"
        position="fixed"
        zindex={1000}
        top="0"
      >
        <CenteredFlex
          justifyContent="space-between"
          width="90%"
          height="100%"
        >
          {/* LOGO */}
          <Container
            maxWidth="min-content"
            minWidth="75px"
            overflow="hidden"
          >
            <NavLink to="/">
              <img
                alt=".."
                src={logo}
                style={{
                  cursor: 'pointer',
                  height: 'auto',
                  overflow: 'hidden',
                  width: '100%',
                }}
                onClick={() => console.log('clicked on logo!')}
              />
            </NavLink>
          </Container>

          {/* Account */}
          <CenteredFlex
            justifyContent="space-around"
            width="20%"
            height="100%"
          >
            {/* Keeping only route here as lone route at middle of nav looks off */}
            {
              isUserAuthenticated && loc.pathname !== '/todo' && (
                <StyledNavLink className="bold" padding="0 0.8rem" to="/todo">
                  <p>Todo</p>
                </StyledNavLink>
              )
            }

            {isUserAuthenticated && (
            <p
              className="bold"
              style={{
                padding: '0 0.8rem',
              }}
            >
              {`Hi, ${name}`}
            </p>
            )}

            {isUserAuthenticated && (
            <BlankButton onClick={signOutHandler}>
              <span className="bold"> Sign Out</span>
            </BlankButton>
            )}

            {
              !isUserAuthenticated && loc.pathname !== '/login' && (
                <StyledNavLink className="bold" padding="0 0.8rem" to="/login">
                  <p>Login</p>
                </StyledNavLink>
              )
            }

            {
              !isUserAuthenticated && loc.pathname !== '/signup' && (
                <StyledNavLink className="bold" padding="0 0.8rem" to="/signup">
                  <p>Signup</p>
                </StyledNavLink>
              )
            }
          </CenteredFlex>

        </CenteredFlex>
      </CenteredFlex>
      {/* Reserved space taken by the absolute Navbar */}
      <Container
        width="100%"
        height="10vh"
      />
      {/* Reserved space taken by the absolute Navbar */}
    </>
  );
}

export default Navbar;
