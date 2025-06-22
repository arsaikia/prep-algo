import {
  takeEvery,
  put,
  call,
} from 'redux-saga/effects';

import {
  SIGNUP,
  SIGNUP_SUCCESS,
} from '../actions/types';
import { signup } from '../api/signup';

// worker Saga
function* signupHandler(action) {
  const questionsDataResponse = yield call(signup, action.payload);

  yield put({
    payload: {
      isSignedUp: questionsDataResponse.status === 200,
    },
    type: SIGNUP_SUCCESS,
  });


}

function* userSignupWatcher() {
  yield takeEvery(SIGNUP, signupHandler);
}

export {
  userSignupWatcher,
};
