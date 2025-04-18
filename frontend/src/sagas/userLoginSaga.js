import {
  takeEvery,
  put,
  call,
} from 'redux-saga/effects';

import {
  LOGIN, LOGIN_SUCCESS,
} from '../actions/types';
import { login } from '../api/login';

// worker Saga
function* loginHandler(action) {
  const questionsDataResponse = yield call(login, action.payload);
  const {
    userId, firstName, lastName,
  } = questionsDataResponse?.data?.data ?? {};
  console.log(questionsDataResponse);
  yield put({
    payload: {
      firstName,
      isAuthenticated: questionsDataResponse.status === 200,
      lastName,
      userId,
    },
    type: LOGIN_SUCCESS,
  });

  console.log(questionsDataResponse);
}

function* userLoginWatcher() {
  yield takeEvery(LOGIN, loginHandler);
}

export {
  userLoginWatcher,
};
