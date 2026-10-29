import {
    takeLatest,
    put,
    call,
} from 'redux-saga/effects';

import {
    GOOGLE_LOGIN,
    GOOGLE_LOGIN_SUCCESS,
    GOOGLE_LOGIN_FAILURE,
    RESET_AUTH_SUCCESS,
} from '../actions/types';
import { googleLogin } from '../api/login';
import readApiError from '../utils/apiError';
// Cookie utility functions
const setCookie = (name, value, options = {}) => {
    const defaultOptions = { path: '/', maxAge: 86400 * 7 }; // 7 days
    const cookieOptions = { ...defaultOptions, ...options };

    let cookieString = `${name}=${encodeURIComponent(value)}`;

    if (cookieOptions.path) cookieString += `; path=${cookieOptions.path}`;
    if (cookieOptions.maxAge) cookieString += `; max-age=${cookieOptions.maxAge}`;
    if (cookieOptions.domain) cookieString += `; domain=${cookieOptions.domain}`;
    if (cookieOptions.secure) cookieString += `; secure`;
    cookieString += '; SameSite=Strict';

    document.cookie = cookieString;
};

// worker Saga
function* googleLoginHandler(action) {
    if (action.type !== GOOGLE_LOGIN) return;
    try {
        const token = action.payload;

        if (!token) {
            throw new Error('No access token provided');
        }

        // Call the API
        const response = yield call(googleLogin, token);

        if (response.data && response.data.success) {
            const userData = response.data.data;
            if (userData.token) setCookie('authToken', userData.token, { secure: window.location.protocol === 'https:' });

            // Dispatch success action with user data
            yield put({
                type: GOOGLE_LOGIN_SUCCESS,
                payload: {
                    isAuthenticated: true,
                    userId: userData.id || userData.userId || userData._id,
                    id: userData.id || userData._id || userData.userId,
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
            payload: readApiError(error, 'Google sign-in failed. Please try again.')
        });
    }
}

function* googleLoginWatcher() {
    yield takeLatest([GOOGLE_LOGIN, RESET_AUTH_SUCCESS, 'AUTH_EXPIRED'], googleLoginHandler);
}

export default googleLoginWatcher; 