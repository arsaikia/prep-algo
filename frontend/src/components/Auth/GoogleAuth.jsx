import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { setCookie } from 'react-cookie';

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
                console.log('Google login response:', response);

                // Get user info from Google
                const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${response.access_token}` },
                }).then(res => res.json());

                console.log('Google user info:', userInfo);

                // Dispatch login action with Google user info and token
                dispatch(loginWithGoogle({
                    token: response.access_token,
                    googleId: userInfo.sub,
                    email: userInfo.email,
                    firstName: userInfo.given_name,
                    lastName: userInfo.family_name,
                    picture: userInfo.picture
                }));

                // Set cookies for user session
                setCookie('userId', userInfo.sub, { path: '/' });
                setCookie('name', userInfo.given_name, { path: '/' });

                // Redirect to home page
                navigate('/');
            } catch (error) {
                console.error('Error during Google login:', error);
            }
        },
        onError: (error) => {
            console.error('Google login failed:', error);
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