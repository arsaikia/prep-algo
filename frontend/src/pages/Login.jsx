/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useEffect } from 'react';

import {
  useDispatch, useSelector,
} from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import GoogleAuth from '../components/Auth/GoogleAuth';
import {
  GlassBackground,
  GlassCard,
  AppIcon,
  ModernTitle,
  fadeIn
} from '../components/Auth/loginStyles';
import {
  CenteredFlex,
} from '../styles';

// Login-specific styled components
const LoginCard = styled(GlassCard)`
  padding: 48px 40px;
  min-width: 400px;
  
  @media (max-width: 768px) {
    padding: 36px 28px;
    min-width: 320px;
  }
  
  @media (max-width: 480px) {
    padding: 28px 20px;
    min-width: auto;
    margin: 0 16px;
  }
`;

const LoginSection = styled.div`
  position: relative;
  z-index: 1;
  animation: ${fadeIn} 1s ease 0.8s both;
  margin-top: 20px;
`;

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
    <GlassBackground>
      <CenteredFlex minHeight="100vh">
        <LoginCard>
          <AppIcon>✨</AppIcon>
          <ModernTitle>Welcome to RemindMe</ModernTitle>
          <LoginSection>
            <GoogleAuth />
          </LoginSection>
        </LoginCard>
      </CenteredFlex>
    </GlassBackground>
  );
}

export default Login;
