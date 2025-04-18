import {
  call,
  put,
  takeEvery,
} from 'redux-saga/effects';

import {
  CLOSE_CODE_MODAL,
  CLOSE_CODE_MODAL_SUCCESS,
  FETCH_CODE_ERROR,
  FETCH_CODE_SUCCESS,
  HIDE_LOADING,
  SHOW_CODE_MODAL,
  SHOW_LOADING,
  TOGGLE_CODE_MODAL,
} from '../actions/types';
import getCode from '../api/fetchCode';

// worker Saga
function* toggleCodeHandler(action) {
  const {
    fetchCode, id, group, link,
  } = action.payload;

  console.log(action.payload);

  yield put({
    payload: {
      questionId: id,
    },
    type: SHOW_CODE_MODAL,
  });

  yield put({
    type: SHOW_LOADING,
  });

  if (fetchCode) {
    const questionsDataResponse = yield call(getCode, group, link.slice(0, -1));
    console.log(questionsDataResponse);
    if (questionsDataResponse) {
      yield put({
        payload: {
          code: questionsDataResponse,
          questionId: id,
        },
        type: FETCH_CODE_SUCCESS,
      });
    } else {
      yield put({
        payload: {
          code: '<>CODE NOT FOUND FOR SELECTED QUESTION</>',
          questionId: id,
        },
        type: FETCH_CODE_ERROR,
      });
    }
  }
  yield put({
    type: HIDE_LOADING,
  });
}

function* launchCodeModal() {
  yield takeEvery(TOGGLE_CODE_MODAL, toggleCodeHandler);
}

// CLOSE CODE MODAL

function* closeCodeModalHandler() {
  yield put({
    type: CLOSE_CODE_MODAL_SUCCESS,
  });
}

function* closeCodeModal() {
  yield takeEvery(CLOSE_CODE_MODAL, closeCodeModalHandler);
}

export {
  launchCodeModal,
  closeCodeModal,
};
