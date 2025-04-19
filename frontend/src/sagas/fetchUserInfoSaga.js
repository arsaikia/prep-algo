import {
    takeLatest,
    put,
    call,
} from 'redux-saga/effects';

import {
    FETCH_USER_INFO,
    FETCH_USER_INFO_SUCCESS,
    FETCH_USER_INFO_FAILURE,
} from '../actions/types';
import { getUserInfo } from '../api/login';
import {
    fetchUserInfoSuccess,
    fetchUserInfoFailure,
} from '../actions/actions';

// worker Saga
function* fetchUserInfoHandler(action) {
    try {
        console.log('Fetch user info saga started with userId:', action.payload);
        console.log('Action type:', action.type);
        console.log('Full action:', action);

        // Call the API with the userId
        console.log('Calling getUserInfo API with userId:', action.payload);
        const response = yield call(getUserInfo, action.payload);
        console.log('Fetch user info API response:', response);

        if (response.data && response.data.success) {
            console.log('User info fetched successfully:', response.data.user);
            // Dispatch success with user data
            yield put(fetchUserInfoSuccess({
                ...response.data.user,
                isAuthenticated: true,
                lastActivity: Date.now(),
            }));
        } else {
            console.error('API response did not indicate success:', response.data);
            throw new Error(response.data?.message || 'Failed to fetch user info');
        }
    } catch (error) {
        console.error('Fetch user info saga error:', error);
        console.error('Error details:', error.message, error.stack);
        yield put(fetchUserInfoFailure(error.message));
    }
}

function* fetchUserInfoWatcher() {
    console.log('fetchUserInfoWatcher started');
    yield takeLatest(FETCH_USER_INFO, fetchUserInfoHandler);
}

export default fetchUserInfoWatcher; 