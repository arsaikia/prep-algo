import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { loginWithGoogle } from '../../actions/actions';
import { GoogleButtonContainer } from './loginStyles';

const GoogleAuth = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const isDarkMode = useSelector((state) => state.theme.isDarkModeEnabled);

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
                theme={isDarkMode ? "filled_black" : "outline"}
                size="large"
                width="100%"
                text="continue_with"
                shape="rectangular"
            />
        </GoogleButtonContainer>
    );
};

export default GoogleAuth; 