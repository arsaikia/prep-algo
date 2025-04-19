/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';

import { useWindowSize } from '@uidotdev/usehooks';
import { useCookies } from 'react-cookie';
import {
  useSelector,
  useDispatch,
} from 'react-redux';
import {
  NavLink, useLocation, useNavigate,
} from 'react-router-dom';
import styled from 'styled-components';

import {
  getQuestions, resetAuthState,
} from '../actions/actions';
import logo from '../logo.png';
import {
  Container, Flex, CenteredFlex, StyledNavLink, BlankButton,
} from '../styles';
import GoogleLoginModal from './Auth/GoogleLoginModal';

// Styled components
const NavContainer = styled.nav`
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  height: 70px;
`;

const NavContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  height: 100%;
`;

const Logo = styled(NavLink)`
  display: flex;
  align-items: center;
  
  img {
    height: 40px;
    width: auto;
    max-width: 100%;
    object-fit: contain;
    transition: transform 0.2s ease;
    
    &:hover {
      transform: scale(1.05);
    }
  }
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const NavLinkItem = styled(NavLink)`
  color: #333;
  text-decoration: none;
  padding: 10px 15px;
  margin: 0 5px;
  border-radius: 4px;
  font-weight: 500;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: #f5f5f5;
  }
  
  &.active {
    color: #4a90e2;
    font-weight: 600;
  }
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  margin-right: 15px;
  position: relative;
`;

const ProfilePicture = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;
  
  &:hover {
    transform: scale(1.05);
  }
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  span {
    color: #666;
    font-size: 14px;
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: 45px;
  right: 0;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 160px;
  z-index: 1001;
  overflow: hidden;
  display: ${props => props.isOpen ? 'block' : 'none'};
`;

const DropdownItem = styled.div`
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  
  &:hover {
    background-color: #f5f5f5;
  }
  
  svg {
    margin-right: 10px;
    width: 16px;
    height: 16px;
  }
`;

const UserName = styled.span`
  font-weight: 500;
`;

const SignOutButton = styled.button`
  background-color: #f5f5f5;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: #e0e0e0;
  }
`;

const LoginButton = styled(NavLink)`
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-weight: 500;
  text-decoration: none;
  margin-left: 10px;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: #3a7bc8;
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px;
  
  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 30px;
    height: 24px;
    padding: 0;
    margin-left: 15px;
  }
  
  span {
    width: 100%;
    height: 3px;
    background-color: #333;
    border-radius: 3px;
    transition: all 0.3s ease;
    
    &:nth-child(1) {
      transform: ${props => props.isOpen ? 'translateY(9px) rotate(45deg)' : 'none'};
    }
    
    &:nth-child(2) {
      opacity: ${props => props.isOpen ? '0' : '1'};
    }
    
    &:nth-child(3) {
      transform: ${props => props.isOpen ? 'translateY(-9px) rotate(-45deg)' : 'none'};
    }
  }
`;

const MobileMenuContainer = styled.div`
  display: none;
  position: fixed;
  top: 70px;
  left: 0;
  right: 0;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 999;
  
  @media (max-width: 768px) {
    display: ${props => props.isOpen ? 'block' : 'none'};
  }
`;

const MobileNavLink = styled(NavLink)`
  display: block;
  padding: 15px 20px;
  color: #333;
  text-decoration: none;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 500;
  
  &:hover {
    background-color: #f5f5f5;
  }
  
  &.active {
    color: #4a90e2;
    font-weight: 600;
  }
`;

const MobileUserSection = styled.div`
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
`;

const MobileProfilePicture = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  span {
    color: #666;
    font-size: 16px;
  }
`;

const MobileSignOutButton = styled.button`
  display: block;
  width: 100%;
  padding: 15px 20px;
  background: none;
  border: none;
  text-align: left;
  color: #333;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background-color: #f5f5f5;
  }
`;

const NavbarSpacer = styled.div`
  height: 70px;
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4a90e2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const Toast = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: #4caf50;
  color: white;
  padding: 12px 20px;
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 2000;
  animation: fadeIn 0.3s, fadeOut 0.3s 2.7s;
  animation-fill-mode: forwards;
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(20px); }
  }
`;

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    width,
  } = useWindowSize();
  const isMobile = width < 768;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const dropdownRef = useRef(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Initialize cookies with default values to prevent undefined errors
  const [cookies, setCookie, removeCookie] = useCookies(['userId', 'name']);

  // Get states using useSelector ( state->reducerName )
  const userAuthState = useSelector((state) => state.auth);

  // Fire actions using dispatch -> fires action -> Watcher saga handles rest
  const dispatch = useDispatch();
  // const fetchAllQuestions = (userId) => dispatch(getQuestions(userId));
  const resetAuth = () => dispatch(resetAuthState());

  // Safely access cookie values with fallbacks
  const userIdInCookie = cookies?.userId || '';
  const userName = cookies?.name || '';
  const isUserAuthenticated = !!userIdInCookie;
  const userPicture = userAuthState?.picture || '';

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle toast display
  useEffect(() => {
    let timer;
    if (showToast) {
      timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showToast]);

  /** ****************************************************************************
   * HANDLER FUNCTIONS
  ***************************************************************************** */
  const signOutHandler = async () => {
    try {
      setIsSigningOut(true);
      setIsDropdownOpen(false);

      // Clear all auth-related cookies with safe checks
      if (cookies?.userId) removeCookie('userId');
      if (cookies?.name) removeCookie('name');

      // Reset Redux auth state
      resetAuth();

      // Simulate a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));

      // Show success message
      setShowToast(true);

      // Navigate to home page
      navigate('/');
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLoginClick = () => {
    setIsLoginModalOpen(true);
  };

  return (
    <>
      {isSigningOut && (
        <LoadingOverlay>
          <LoadingSpinner />
        </LoadingOverlay>
      )}

      {showToast && (
        <Toast>
          Successfully signed out
        </Toast>
      )}

      <NavContainer>
        <NavContent>
          <Logo to="/">
            <img src={logo} alt="Logo" />
          </Logo>

          <NavLinks>
            {isUserAuthenticated && (
              <NavLinkItem to="/todo" className={location.pathname === '/todo' ? 'active' : ''}>
                Todo
              </NavLinkItem>
            )}
          </NavLinks>

          <UserSection>
            {isUserAuthenticated ? (
              <UserProfile ref={dropdownRef}>
                <ProfilePicture onClick={toggleDropdown}>
                  {userPicture ? (
                    <img src={userPicture} alt={userName} />
                  ) : (
                    <span>{userName ? userName.charAt(0).toUpperCase() : 'U'}</span>
                  )}
                </ProfilePicture>
                <DropdownMenu isOpen={isDropdownOpen}>
                  <DropdownItem onClick={signOutHandler}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Sign Out
                  </DropdownItem>
                </DropdownMenu>
              </UserProfile>
            ) : (
              <>
                {location.pathname !== '/login' && (
                  <LoginButton onClick={handleLoginClick}>Login</LoginButton>
                )}
              </>
            )}
          </UserSection>

          <MobileMenuButton onClick={toggleMobileMenu} isOpen={isMobileMenuOpen}>
            <span></span>
            <span></span>
            <span></span>
          </MobileMenuButton>
        </NavContent>
      </NavContainer>

      <MobileMenuContainer isOpen={isMobileMenuOpen}>
        {isUserAuthenticated && (
          <MobileNavLink to="/todo" className={location.pathname === '/todo' ? 'active' : ''}>
            Todo
          </MobileNavLink>
        )}

        {isUserAuthenticated ? (
          <>
            <MobileUserSection>
              <MobileProfilePicture>
                {userPicture ? (
                  <img src={userPicture} alt={userName} />
                ) : (
                  <span>{userName ? userName.charAt(0).toUpperCase() : 'U'}</span>
                )}
              </MobileProfilePicture>
            </MobileUserSection>
            <MobileSignOutButton onClick={signOutHandler}>
              Sign Out
            </MobileSignOutButton>
          </>
        ) : (
          location.pathname !== '/login' && (
            <MobileNavLink to="#" onClick={handleLoginClick}>
              Login
            </MobileNavLink>
          )
        )}
      </MobileMenuContainer>

      <GoogleLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <NavbarSpacer />
    </>
  );
}

export default Navbar;
