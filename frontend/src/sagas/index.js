import {
  all,
  fork,
} from 'redux-saga/effects';

import getQuestionsWatcher from './getAllQuestionsSaga';
import getAllQuestionsWithoutHistoryWatcher from './getAllQuestionsWithoutHistorySaga';
import { googleLoginWatcher } from './googleLoginSaga';
import {
  launchCodeModal, closeCodeModal,
} from './launchCodeModal';
import { markQuestionAsDoneWatcher } from './markQuestionAsDone';
import { resetAuthSagaWatcher } from './resetAuthSaga';
import { setThemeWatcher } from './themeSaga';
import { userLoginWatcher } from './userLoginSaga';
import { userSignupWatcher } from './userSignupSaga';

export default function* rootSaga() {
  console.log('Root saga started');
  yield all([
    fork(googleLoginWatcher),
    fork(resetAuthSagaWatcher),
    fork(setThemeWatcher),
    fork(getQuestionsWatcher),
    fork(getAllQuestionsWithoutHistoryWatcher),
    fork(markQuestionAsDoneWatcher),
    fork(launchCodeModal),
    fork(closeCodeModal),
  ]);
}
