import {
  takeEvery,
  put,
  call,
} from 'redux-saga/effects';

import { getQuestions } from '../actions/actions';
import { MARK_QUESTION_AS_DONE } from '../actions/types';
import { setQuestionAsDone } from '../api/setQuestionAsDone';

// worker Saga
function* handleQuestionDone(action) {
  try {
    yield call(setQuestionAsDone, action.payload);
    yield put(getQuestions(action.payload.userId));
  } catch (error) {

  }
}

function* markQuestionAsDoneWatcher() {
  yield takeEvery(MARK_QUESTION_AS_DONE, handleQuestionDone);
}

export {
  markQuestionAsDoneWatcher,
};
