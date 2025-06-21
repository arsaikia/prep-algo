/* eslint-disable no-console */
import axios from 'axios';
import {
  call, put, takeEvery,
} from 'redux-saga/effects';

import {
  GET_ALL_QUESTIONS,
  GET_SOLVED_QUESTIONS,
  HIDE_FETCH_LOADING,
  SHOW_FETCH_LOADING,
} from '../actions/types';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.REACT_APP_API_BASE_URL_PROD
  : process.env.REACT_APP_API_BASE_URL_DEV || 'http://localhost:8080';

function* fetchAllQuestions(action) {
  // Make loading true
  yield put({
    type: SHOW_FETCH_LOADING,
  });

  try {
    const { userId } = action.payload;
    console.log('Fetching questions for userId:', userId);

    const response = yield call(axios.get, `${API_BASE_URL}/api/v1/questions/get-questions/${userId}`);

    if (response.status === 200) {
      const { allQuestions, solvedQuestions } = response.data;

      // Store all questions
      yield put({
        payload: allQuestions,
        type: GET_ALL_QUESTIONS,
      });

      // Store solved questions
      yield put({
        payload: solvedQuestions,
        type: GET_SOLVED_QUESTIONS,
      });

      console.log('Questions fetched successfully');
    } else {
      console.error('Failed to fetch questions:', response.status);
    }
  } catch (error) {
    console.error('Error fetching questions:', error);
  }

  // Make loading False -> Questions fetched
  yield put({
    type: HIDE_FETCH_LOADING,
  });
}

function* getQuestionsWatcher() {
  yield takeEvery(GET_ALL_QUESTIONS, fetchAllQuestions);
}

export default getQuestionsWatcher;
