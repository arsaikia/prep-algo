/* eslint-disable default-param-last */
import {
  GET_ALL_QUESTIONS,
  GET_ALL_QUESTIONS_WITHOUT_HISTORY,
  GET_ALL_QUESTIONS_WITHOUT_HISTORY_SUCCESS,
  GET_ALL_QUESTIONS_WITHOUT_HISTORY_FAILURE,
  GET_QUESTIONS,
  GET_SOLVED_QUESTIONS,
  GET_TOP_QUESTIONS,
  HIDE_FETCH_LOADING,
  SHOW_FETCH_LOADING,
} from '../actions/types.js';

const initialState = {
  allQuestions: {
    groups: [],
    questions: {},
  },
  allQuestionsWithoutHistory: {
    groups: [],
    questions: {},
  },
  isFetchingQuestions: true,
  solvedQuestions: [],
  contentError: null,
  progressStatus: 'unknown',
  progressError: null,
  progressRows: null,
  progressUserId: null,
  progressDomain: null,
  requestUserId: null,
  requestDomain: null,
  topQuestions: {
    groups: [],
    questions: {},
  },
};

const questionReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'RESET_AUTH_SUCCESS':
    case 'AUTH_GUEST':
    case 'AUTH_EXPIRED':
    case 'GOOGLE_LOGIN_FAILURE':
      return { ...state, allQuestions: initialState.allQuestions, solvedQuestions: [], progressRows: null, progressUserId: null, progressDomain: null, requestUserId: null, requestDomain: null, progressStatus: 'unknown', progressError: null };
    case GET_QUESTIONS:
      return {
        ...state,
        requestUserId: action.userId,
        requestDomain: action.domain,
        allQuestions: action.userId === state.progressUserId && action.domain === state.progressDomain ? state.allQuestions : initialState.allQuestions,
        progressStatus: 'loading',
        progressError: null,
        contentError: null,
      };
    case 'QUESTION_LIST_FAILURE':
      if (action.userId !== state.requestUserId || action.domain !== state.requestDomain) return state;
      return { ...state, contentError: action.payload, progressStatus: 'unavailable' };
    case GET_ALL_QUESTIONS_WITHOUT_HISTORY_FAILURE:
      return { ...state, contentError: action.payload, isFetchingQuestions: false };
    case SHOW_FETCH_LOADING:
      return {
        ...state,
        isFetchingQuestions: true,
      };

    case HIDE_FETCH_LOADING:
      return {
        ...state,
        isFetchingQuestions: false,
      };

    case GET_ALL_QUESTIONS:
      if (action.userId !== state.requestUserId || action.domain !== state.requestDomain) return state;
      return {
        ...state,
        allQuestions: action.payload,
        contentError: null,
        progressUserId: action.userId,
        progressDomain: action.domain,
        progressRows: action.progressRows,
        progressError: action.progressError,
        progressStatus: action.progressError ? 'unavailable' : 'ready',
      };

    case GET_ALL_QUESTIONS_WITHOUT_HISTORY:
      return {
        ...state,
        isFetchingQuestions: true,
      };

    case GET_ALL_QUESTIONS_WITHOUT_HISTORY_SUCCESS:
      return {
        ...state,
        allQuestionsWithoutHistory: action.payload,
        isFetchingQuestions: false,
        contentError: null,
      };

    case GET_TOP_QUESTIONS:
      return {
        ...state,
        topQuestions: action.payload,
      };

    case GET_SOLVED_QUESTIONS:
      if (action.userId !== state.requestUserId || action.domain !== state.requestDomain) return state;
      return {
        ...state,
        solvedQuestions: action.payload,
      };

    default:
      return state;
  }
};

export default questionReducer;
