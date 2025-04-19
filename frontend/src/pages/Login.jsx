/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useEffect } from 'react';

import {
  useDispatch, useSelector,
} from 'react-redux';
import { useNavigate } from 'react-router-dom';

import GoogleAuth from '../components/Auth/GoogleAuth';
import {
  CenteredFlex,
  Container,
  Flex,
} from '../styles';

function Login() {
  const navigate = useNavigate();

  // Get states using useSelector ( state -> reducerName )
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  return (
    <CenteredFlex minHeight="60vh">
      <Container minWidth="auto" border="1px solid grey" padding="20px">
        <h1>Login</h1>
        <Flex
          direction="column"
          alignItems="center"
          justifyContent="center"
          style={{ marginTop: '20px' }}
        >
          <GoogleAuth />
        </Flex>
      </Container>
    </CenteredFlex>
  );
}

export default Login;
