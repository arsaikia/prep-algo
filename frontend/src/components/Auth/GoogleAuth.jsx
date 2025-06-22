import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import { loginWithGoogle } from '../../actions/actions';

const GoogleButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
`;

const GoogleAuth = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            // The credential token is in credentialResponse.credential
            // This is the ID token that our backend expects
            if (!credentialResponse.credential) {
                console.error('No credential token found in response');
                return;
            }

            // Dispatch login action with the ID token
            dispatch(loginWithGoogle(credentialResponse.credential));

            // Navigate to home page - the saga will handle setting cookies
            navigate('/');
        } catch (error) {
            console.error('Error during Google login:', error);
        }
    };

    const handleGoogleError = () => {
        console.error('Google login failed');
    };

    return (
        <GoogleButtonContainer>
            <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                width="100%"
            />
        </GoogleButtonContainer>
    );
};

export default GoogleAuth; 