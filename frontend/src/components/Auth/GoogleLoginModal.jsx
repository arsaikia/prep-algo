import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { loginWithGoogle } from '../../actions/actions';
import { ExternalLink, ChevronDown, ChevronRight } from 'react-feather';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: ${({ theme }) => theme.colors.background};
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  text-align: center;
  max-width: 350px;
  width: 90%;
  position: relative;
  border: 1px solid ${({ theme }) => theme.colors.border || 'rgba(0, 0, 0, 0.1)'};
  
  @media (max-width: 480px) {
    width: 95%;
    padding: 1.5rem;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  
  &:hover {
    opacity: 1;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const GoogleLoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-top: 0.5rem;
  
  > div {
    width: 100% !important;
    max-width: 300px;
    
    @media (max-width: 480px) {
      max-width: 250px;
    }
  }
`;

const ModalTitle = styled.h2`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
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
        <CloseButton onClick={onClose}>×</CloseButton>
        <ModalTitle>Login to Remind Me</ModalTitle>
        <GoogleLoginContainer>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap
            theme={isDarkMode ? "filled_black" : "filled_blue"}
            size="large"
            width="100%"
          />
        </GoogleLoginContainer>
      </ModalContent>
    </ModalOverlay>
  );
};

export default GoogleLoginModal; 