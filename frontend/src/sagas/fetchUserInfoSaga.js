import { call, put, takeLatest } from 'redux-saga/effects';
import { getUserInfo } from '../api/login';
import {
    FETCH_USER_INFO,
    FETCH_USER_INFO_SUCCESS,
    FETCH_USER_INFO_FAILURE
} from '../actions/types';

function* fetchUserInfoSaga(action) {
    if (action.type !== FETCH_USER_INFO) return;
    try {
        const response = yield call(getUserInfo, action.payload);

        if (response.data && response.data.success) {
            yield put({
                type: FETCH_USER_INFO_SUCCESS,
                payload: response.data.user
            });
        } else {
            throw new Error(response.data?.message || 'Failed to fetch user info');
        }
    } catch (error) {
        yield put({
            type: FETCH_USER_INFO_FAILURE,
            payload: error.message || 'Failed to fetch user info'
        });
    }
}

function* fetchUserInfoWatcher() {
    yield takeLatest([FETCH_USER_INFO, 'GOOGLE_LOGIN', 'RESET_AUTH_SUCCESS', 'AUTH_EXPIRED'], fetchUserInfoSaga);
}

export default fetchUserInfoWatcher; 