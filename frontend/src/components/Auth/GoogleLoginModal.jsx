import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { loginWithGoogle } from '../../actions/actions';
import {
  ModalOverlay,
  GlassCard,
  ModernCloseButton,
  AppIcon,
  ModernTitle,
  ModernSubtitle,
  GoogleButtonContainer,
  slideUp
} from './loginStyles';

// Modal-specific styled components
const ModalContent = styled(GlassCard)`
  padding: 40px 32px;
  text-align: center;
  max-width: 400px;
  width: 100%;
  animation: ${slideUp} 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  
  @media (max-width: 480px) {
    padding: 32px 24px;
    border-radius: 20px;
    margin: 0 16px;
  }
`;

const ModalGoogleContainer = styled(GoogleButtonContainer)`
  margin-top: 24px;
  
  @media (max-width: 480px) {
    margin-top: 20px;
  }
`;

const GoogleLoginModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state) => state.theme.isDarkModeEnabled);

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      // The credential token is in credentialResponse.credential
      // We need to pass just the token string, not the entire response object
      if (!credentialResponse.credential) {
        console.error('No credential token found in response');
        return;
      }

      // Pass just the credential token to the login action
      await dispatch(loginWithGoogle(credentialResponse.credential));
      onClose();
    } catch (error) {
      console.error('Google login failed:', error);
    }
  };

  const handleGoogleError = () => {
    console.error('Google login failed');
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModernCloseButton onClick={onClose}>×</ModernCloseButton>
        <AppIcon size={56}>✨</AppIcon>
        <ModernTitle size="medium">Welcome Back!</ModernTitle>
        <ModernSubtitle>
          Continue your coding journey with RemindMe
        </ModernSubtitle>
        <ModalGoogleContainer>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme={isDarkMode ? "filled_black" : "outline"}
            size="large"
            width="100%"
            text="continue_with"
            shape="rectangular"
          />
        </ModalGoogleContainer>
      </ModalContent>
    </ModalOverlay>
  );
};

export default GoogleLoginModal; 