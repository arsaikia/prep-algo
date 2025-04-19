import {
    takeEvery,
    put,
    call,
} from 'redux-saga/effects';

import {
    GOOGLE_LOGIN,
    GOOGLE_LOGIN_SUCCESS,
} from '../actions/types';
import { loginWithGoogle } from '../api/login';

// worker Saga
function* googleLoginHandler(action) {
    try {
        // Call the backend API to register/login the Google user
        const response = yield call(loginWithGoogle, action.payload);

        if (response.status === 200) {
            // If successful, update the auth state
            yield put({
                type: GOOGLE_LOGIN_SUCCESS,
                payload: action.payload,
            });
        } else {
            console.error('Google login failed:', response);
        }
    } catch (error) {
        console.error('Error during Google login:', error);
    }
}

function* googleLoginWatcher() {
    yield takeEvery(GOOGLE_LOGIN, googleLoginHandler);
}

export {
    googleLoginWatcher,
}; 