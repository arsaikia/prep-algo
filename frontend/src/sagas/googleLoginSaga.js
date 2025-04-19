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

// worker Saga
function* googleLoginHandler(action) {
    try {
        console.log('Google login saga started with payload:', action.payload);

        // The credential is directly in action.payload as a string
        const credential = action.payload;
        if (!credential || typeof credential !== 'string') {
            throw new Error('Invalid credential token received from Google');
        }

        // Call the API with the credential token
        const response = yield call(googleLogin, { token: credential });
        console.log('Google login API response:', response);

        if (response.data && response.data.success) {
            // Dispatch success with user data and JWT token
            yield put(googleLoginSuccess({
                ...response.data.user,
                token: response.data.token,
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