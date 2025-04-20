import {
    takeLatest,
    put,
    call,
} from 'redux-saga/effects';

import {
    GOOGLE_LOGIN,
    GOOGLE_LOGIN_SUCCESS,
    GOOGLE_LOGIN_FAILURE,
} from '../actions/types';
import { googleLogin } from '../api/login';
import {
    googleLoginSuccess,
    googleLoginFailure,
} from '../actions/actions';
import { setCookie } from 'react-cookie';

// Cache for profile pictures
const profilePictureCache = new Map();

// Function to get a default avatar URL based on user's name
const getDefaultAvatarUrl = (firstName) => {
    const initial = firstName ? firstName.charAt(0).toUpperCase() : 'U';
    return `https://ui-avatars.com/api/?name=${initial}&background=random`;
};

// Function to handle profile picture with fallback
const handleProfilePicture = (user) => {
    // If we have a cached version, use it
    if (profilePictureCache.has(user.id)) {
        return profilePictureCache.get(user.id);
    }

    // If no picture URL or it's the Google default URL that's failing
    if (!user.picture || user.picture.includes('googleusercontent.com')) {
        const defaultAvatar = getDefaultAvatarUrl(user.firstName);
        profilePictureCache.set(user.id, defaultAvatar);
        return defaultAvatar;
    }

    // Cache and return the original picture URL
    profilePictureCache.set(user.id, user.picture);
    return user.picture;
};

// worker Saga
function* googleLoginHandler(action) {
    try {
        console.log('Google login saga started with token');

        // The credential is directly in action.payload as a string
        const token = action.payload;
        if (!token || typeof token !== 'string') {
            throw new Error('Invalid token received from Google');
        }

        // Call the API with the token
        const response = yield call(googleLogin, { token });
        console.log('Google login API response:', response);

        if (response.data && response.data.success) {
            const { user, token: jwtToken } = response.data;

            // Handle profile picture with fallback
            const processedUser = {
                ...user,
                picture: handleProfilePicture(user)
            };

            // Set cookies for user session
            setCookie('userId', processedUser.id, { path: '/' });
            setCookie('name', processedUser.firstName, { path: '/' });
            setCookie('authToken', jwtToken, { path: '/' });

            // Dispatch success with user data and JWT token
            yield put(googleLoginSuccess({
                ...processedUser,
                token: jwtToken,
                lastActivity: Date.now(),
            }));
        } else {
            throw new Error(response.data?.message || 'Google login failed');
        }
    } catch (error) {
        console.error('Google login saga error:', error);
        yield put(googleLoginFailure(error.message));
    }
}

function* googleLoginWatcher() {
    yield takeLatest(GOOGLE_LOGIN, googleLoginHandler);
}

export default googleLoginWatcher; 