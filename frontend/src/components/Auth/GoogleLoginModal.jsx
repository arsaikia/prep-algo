import React, { useEffect } from 'react';
import Modal from 'react-modal';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import GoogleAuth from './GoogleAuth';
import { ModernCloseButton } from './loginStyles';

const Content = styled.div`
  position: relative;
  display: grid;
  gap: 24px;
  padding: 64px 24px 32px;
  width: min(400px, calc(100vw - 32px));
  box-sizing: border-box;
  text-align: center;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.borderLight};
  border-radius: 20px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.25);

  @media (max-width: 480px) {
    padding-inline: 20px;
  }
`;

const Title = styled.h2`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 24px;
  font-weight: 750;
  letter-spacing: -0.02em;
  line-height: 1.3;
`;

const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 15px;
  line-height: 1.6;
`;

function GoogleLoginModal({ isOpen, onClose, onAuthenticated }) {
  const authenticated = useSelector((state) => state.auth.status === 'authenticated');
  useEffect(() => {
    if (isOpen && authenticated) {
      if (onAuthenticated) onAuthenticated();
      else onClose();
    }
  }, [isOpen, authenticated, onClose, onAuthenticated]);
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      appElement={document.getElementById('root')}
      contentLabel="Sign in to PrepAlgo"
      style={{
        overlay: { zIndex: 3000, background: 'rgba(0,0,0,.65)', display: 'grid', placeItems: 'center' },
        content: { position: 'static', padding: 0, border: 0, background: 'transparent', overflow: 'auto', maxHeight: '95dvh' },
      }}
    >
      <Content>
        <ModernCloseButton type="button" aria-label="Close sign-in" onClick={onClose}>×</ModernCloseButton>
        <header>
          <Title>Sign in to PrepAlgo</Title>
          <Subtitle>Your current page and work stay here.</Subtitle>
        </header>
        <GoogleAuth />
      </Content>
    </Modal>
  );
}

export default GoogleLoginModal;
