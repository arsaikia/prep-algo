import {
  call,
  put,
  takeEvery,
} from 'redux-saga/effects';

import { login } from '../api/login';
import { getQuestions } from '../api/getQuestions';
import {
  LOGIN,
  LOGIN_SUCCESS,
  LOGIN_FAILURE,
  GET_ALL_QUESTIONS,
} from '../actions/types';

// worker Saga
function* userLoginHandler(action) {
  try {
    const response = yield call(login, action.payload);

    if (response.data.success) {
      yield put({
        type: LOGIN_SUCCESS,
        payload: response.data.data,
      });

      // Fetch questions after successful login
      const questionsDataResponse = yield call(getQuestions);

      if (questionsDataResponse.success) {
        yield put({
          type: GET_ALL_QUESTIONS,
          payload: questionsDataResponse.data,
        });
      }
    }
  } catch (error) {
    yield put({
      type: LOGIN_FAILURE,
      payload: error.message,
    });
  }
}

// watcher Saga
export function* userLoginWatcher() {
  yield takeEvery(LOGIN, userLoginHandler);
}
