import React from 'react';
import styled from 'styled-components';
import { NavLink } from 'react-router-dom';
import { BlankButton } from '../../styles';

const MobileMenuContainer = styled.div`
  display: ${props => props.isOpen ? 'flex' : 'none'};
  flex-direction: column;
  position: fixed;
  top: 8%;
  left: 0;
  right: 0;
  background: white;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 999;
`;

const MobileNavLink = styled(NavLink)`
  padding: 1rem;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid #eee;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: #f5f5f5;
  }
`;

const MobileButton = styled(BlankButton)`
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: #f5f5f5;
  }
`;

const MobileMenu = ({ isOpen, isUserAuthenticated, name, onSignOut }) => {
    return (
        <MobileMenuContainer isOpen={isOpen}>
            <MobileNavLink to="/">Home</MobileNavLink>
            <MobileNavLink to="/all">All Questions</MobileNavLink>
            {isUserAuthenticated && (
                <MobileNavLink to="/todo">Todo</MobileNavLink>
            )}
            {isUserAuthenticated && (
                <div style={{ padding: '1rem' }}>
                    Hi, {name}
                </div>
            )}
            {isUserAuthenticated ? (
                <MobileButton onClick={onSignOut}>Sign Out</MobileButton>
            ) : (
                <>
                    <MobileNavLink to="/login">Login</MobileNavLink>
                    <MobileNavLink to="/signup">Signup</MobileNavLink>
                </>
            )}
        </MobileMenuContainer>
    );
};

export default MobileMenu; 