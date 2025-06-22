import { call, put, takeEvery } from 'redux-saga/effects';
import { getUserInfo } from '../api/login';
import {
    FETCH_USER_INFO,
    FETCH_USER_INFO_SUCCESS,
    FETCH_USER_INFO_FAILURE
} from '../actions/types';

function* fetchUserInfoSaga(action) {
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
    yield takeEvery(FETCH_USER_INFO, fetchUserInfoSaga);
}

export default fetchUserInfoWatcher; 