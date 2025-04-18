import {
  takeEvery,
  put,
} from 'redux-saga/effects';

import {
  RESET_AUTH,
  RESET_AUTH_SUCCESS,
} from '../actions/types';
// worker Saga
function* resetAuthHandler() {
  yield put({
    type: RESET_AUTH_SUCCESS,
  });
}

function* resetAuthSagaWatcher() {
  yield takeEvery(RESET_AUTH, resetAuthHandler);
}

export {
  resetAuthSagaWatcher,
};
