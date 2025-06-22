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
// Cookie utility functions
const setCookie = (name, value, options = {}) => {
    const defaultOptions = { path: '/', maxAge: 86400 * 7 }; // 7 days
    const cookieOptions = { ...defaultOptions, ...options };

    let cookieString = `${name}=${encodeURIComponent(value)}`;

    if (cookieOptions.path) cookieString += `; path=${cookieOptions.path}`;
    if (cookieOptions.maxAge) cookieString += `; max-age=${cookieOptions.maxAge}`;
    if (cookieOptions.domain) cookieString += `; domain=${cookieOptions.domain}`;
    if (cookieOptions.secure) cookieString += `; secure`;
    if (cookieOptions.httpOnly) cookieString += `; httpOnly`;

    document.cookie = cookieString;
};

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
        const token = action.payload;

        if (!token) {
            throw new Error('No access token provided');
        }

        // Call the API
        const response = yield call(googleLogin, token);

        if (response.data && response.data.success) {
            const userData = response.data.data;

            // Dispatch success action with user data
            yield put({
                type: GOOGLE_LOGIN_SUCCESS,
                payload: {
                    isAuthenticated: true,
                    userId: userData.userId || userData._id,
                    id: userData._id || userData.userId, // Include both for compatibility
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    email: userData.email,
                    picture: userData.picture,
                    token: userData.token,
                    user: userData
                }
            });
        } else {
            throw new Error(response.data?.message || 'Login failed');
        }
    } catch (error) {
        // Dispatch failure action
        yield put({
            type: GOOGLE_LOGIN_FAILURE,
            payload: error.message || 'Google login failed'
        });
    }
}

function* googleLoginWatcher() {
    yield takeLatest(GOOGLE_LOGIN, googleLoginHandler);
}

export default googleLoginWatcher; 