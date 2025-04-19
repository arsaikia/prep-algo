/* eslint-disable sort-keys */
import {
  CLOSE_CODE_MODAL,
  GET_ALL_QUESTIONS_WITHOUT_HISTORY,
  GET_ALL_QUESTIONS_WITHOUT_HISTORY_SUCCESS,
  GET_ALL_QUESTIONS_WITHOUT_HISTORY_FAILURE,
  GET_QUESTIONS,
  GOOGLE_LOGIN,
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

export const getAllQuestionsWithoutHistory = () => ({
  type: GET_ALL_QUESTIONS_WITHOUT_HISTORY,
});

export const getAllQuestionsWithoutHistorySuccess = (data) => ({
  type: GET_ALL_QUESTIONS_WITHOUT_HISTORY_SUCCESS,
  payload: data,
});

export const getAllQuestionsWithoutHistoryFailure = (error) => ({
  type: GET_ALL_QUESTIONS_WITHOUT_HISTORY_FAILURE,
  payload: error,
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

export const loginWithGoogle = (googleUserData) => ({
  type: GOOGLE_LOGIN,
  payload: googleUserData,
});
