import { all } from 'redux-saga/effects';

import getAllQuestionsWatcher from './getAllQuestionsSaga';
import getAllQuestionsWithoutHistoryWatcher from './getAllQuestionsWithoutHistorySaga';
import googleLoginWatcher from './googleLoginSaga';
import { launchCodeModal, closeCodeModal } from './launchCodeModal';
import { markQuestionAsDoneWatcher } from './markQuestionAsDone';
import { resetAuthSagaWatcher } from './resetAuthSaga';
import { setThemeWatcher } from './themeSaga';
import fetchUserInfoWatcher from './fetchUserInfoSaga';

// Root saga combines all watchers
export default function* rootSaga() {
  yield all([
    getAllQuestionsWatcher(),
    getAllQuestionsWithoutHistoryWatcher(),
    googleLoginWatcher(),
    launchCodeModal(),
    closeCodeModal(),
    markQuestionAsDoneWatcher(),
    resetAuthSagaWatcher(),
    setThemeWatcher(),
    fetchUserInfoWatcher(),
  ]);
}
