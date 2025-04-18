import {
  takeEvery,
  put,
  call,
} from 'redux-saga/effects';

import {
  GET_ALL_QUESTIONS,
  GET_QUESTIONS,
  GET_SOLVED_QUESTIONS,
  GET_TODAY_QUESTIONS,
  GET_TOP_QUESTIONS,
  HIDE_FETCH_LOADING,
  SHOW_FETCH_LOADING,
} from '../actions/types';
import { getQuestions } from '../api/getQuestions';
import groupBy from '../utils/groupBy';
import { getQuestionsToReviseToday } from '../utils/revisionHelper';

// worker Saga
function* fetchAllQuestions(action) {
  // Make loading true
  yield put({
    type: SHOW_FETCH_LOADING,
  });

  const questionsDataResponse = yield call(getQuestions, action.userId);
  const allQuestions = questionsDataResponse?.data?.data;
  const groupedQuestions = groupBy(allQuestions, (question) => question.group);
  const questionsGroupNames = Array.from(groupedQuestions.keys());
  const questionWithGroups = {
    groups: questionsGroupNames,
    questions: Object.fromEntries(groupedQuestions),
  };

  // fire action -> reducer to get all questions
  yield put({
    payload: questionWithGroups,
    type: GET_ALL_QUESTIONS,
  });

  // fire action -> reducer to get top 150 questions
  const topQuestions = allQuestions.filter((question) => question.list.includes('TOP 150'));
  const topGroupedQuestions = groupBy(topQuestions, (question) => question.group);
  const topQuestionsGroupNames = Array.from(topGroupedQuestions.keys());
  const topQuestionWithGroups = {
    groups: topQuestionsGroupNames,
    questions: Object.fromEntries(groupedQuestions),
  };
  console.log('getTopQuestions', topQuestionWithGroups);
  yield put({
    payload: topQuestionWithGroups,
    type: GET_TOP_QUESTIONS,
  });

  // fire action -> reducer to get only solved questions
  const solvedQuestions = allQuestions.filter((question) => question.solveCount !== 0);
  yield put({
    payload: solvedQuestions,
    type: GET_SOLVED_QUESTIONS,
  });

  // fire action -> reducer to get only today's reminder questions
  const todoQuestions = getQuestionsToReviseToday(solvedQuestions);

  yield put({
    payload: todoQuestions,
    type: GET_TODAY_QUESTIONS,
  });

  // Make loading False -> Questions fetched
  yield put({
    type: HIDE_FETCH_LOADING,
  });
}

// Watcher Saga
function* getQuestionsWatcher() {
  yield takeEvery(GET_QUESTIONS, fetchAllQuestions);
}

export default getQuestionsWatcher;
