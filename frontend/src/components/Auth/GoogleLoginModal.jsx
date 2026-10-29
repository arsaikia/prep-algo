import React, { useEffect } from 'react';
import Modal from 'react-modal';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import GoogleAuth from './GoogleAuth';
import { GlassCard, ModernCloseButton, ModernTitle, ModernSubtitle } from './loginStyles';

const Content = styled(GlassCard)`
  position: relative;
  padding: 32px 20px;
  width: min(400px, calc(100vw - 32px));
  box-sizing: border-box;
  text-align: center;
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
        <ModernCloseButton aria-label="Close sign-in" onClick={onClose}>×</ModernCloseButton>
        <ModernTitle size="medium">Sign in to PrepAlgo</ModernTitle>
        <ModernSubtitle>Your current page and work stay here.</ModernSubtitle>
        <GoogleAuth />
      </Content>
    </Modal>
  );
}

export default GoogleLoginModal;
