/* eslint-disable sort-keys */
import {
  CLOSE_CODE_MODAL,
  GET_QUESTIONS,
  LOGIN,
  MARK_QUESTION_AS_DONE,
  RESET_AUTH,
  SIGNUP,
  TOGGLE_CODE_MODAL,
  UPDATE_THEME,
} from './types';

export const getQuestions = (value) => ({
  type: GET_QUESTIONS,
  userId: value,
});

export const updateTheme = (value) => ({
  type: UPDATE_THEME,
  payload: value,
});

export const markQuestionAsDone = (value) => ({
  type: MARK_QUESTION_AS_DONE,
  payload: value,
});

export const userLogin = (value) => ({
  type: LOGIN,
  payload: value,
});

export const userSignup = (value) => ({
  type: SIGNUP,
  payload: value,
});

export const resetAuthState = () => ({
  type: RESET_AUTH,
});

export const launchCodeModal = (payload) => ({
  type: TOGGLE_CODE_MODAL,
  payload,
});

export const closeCodeModal = () => ({
  type: CLOSE_CODE_MODAL,
});
