import {
  takeEvery,
  put,
} from 'redux-saga/effects';

import {
  SET_DARK_MODE,
  SET_LIGHT_MODE,
  UPDATE_THEME,
} from '../actions/types';

// worker Saga: will be fired on UPDATE_THEME actions
function* updateTheme(action) {
  if (action.payload === 'DARK') {
    yield put({
      payload: true,
      type: SET_DARK_MODE,
    });
  } else {
    yield put({
      payload: false,
      type: SET_LIGHT_MODE,
    });
  }
}

function* setThemeWatcher() {
  yield takeEvery(UPDATE_THEME, updateTheme);
}

export {
  setThemeWatcher,
};
