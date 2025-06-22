import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import { loginWithGoogle } from '../../actions/actions';

const GoogleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
  color: #757575;
  border: 1px solid #dadce0;
  border-radius: 4px;
  padding: 8px 16px;
  font-family: 'Roboto', sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f8f9fa;
  }
  
  img {
    width: 18px;
    height: 18px;
    margin-right: 8px;
  }
`;

const GoogleAuth = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const login = useGoogleLogin({
        onSuccess: async (response) => {
            try {


                // Dispatch login action with just the token
                // Our backend will verify the token and return user info
                dispatch(loginWithGoogle(response.access_token));

                // Navigate to home page - the saga will handle setting cookies
                navigate('/');
            } catch (error) {
                // Error during Google login
            }
        },
        onError: (error) => {
            // Google login failed
        }
    });

    return (
        <GoogleButton onClick={() => login()}>
            <img
                src="https://www.google.com/favicon.ico"
                alt="Google logo"
            />
            Sign in with Google
        </GoogleButton>
    );
};

export default GoogleAuth; 