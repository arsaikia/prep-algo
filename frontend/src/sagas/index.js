import {
  all,
  fork,
} from 'redux-saga/effects';

import getQuestionsWatcher from './getAllQuestionsSaga';
import {
  launchCodeModal, closeCodeModal,
} from './launchCodeModal';
import { markQuestionAsDoneWatcher } from './markQuestionAsDone';
import { resetAuthSagaWatcher } from './resetAuthSaga';
import { setThemeWatcher } from './themeSaga';
import { userLoginWatcher } from './userLoginSaga';
import { userSignupWatcher } from './userSignupSaga';

export default function* rootSaga() {
  yield all([
    fork(userSignupWatcher),
    fork(userLoginWatcher),
    fork(resetAuthSagaWatcher),
    fork(setThemeWatcher),
    fork(getQuestionsWatcher),
    fork(markQuestionAsDoneWatcher),
    fork(launchCodeModal),
    fork(closeCodeModal),
  ]);
}
