/* eslint-disable default-param-last */
import {
  GET_ALL_QUESTIONS,
  GET_ALL_QUESTIONS_WITHOUT_HISTORY,
  GET_ALL_QUESTIONS_WITHOUT_HISTORY_SUCCESS,
  GET_SOLVED_QUESTIONS,
  GET_TOP_QUESTIONS,
  HIDE_FETCH_LOADING,
  SHOW_FETCH_LOADING,
} from '../actions/types';

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
  topQuestions: {
    groups: [],
    questions: {},
  },
};

const questionReducer = (state = initialState, action) => {
  switch (action.type) {
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
      return {
        ...state,
        allQuestions: action.payload,
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
      };

    case GET_TOP_QUESTIONS:
      return {
        ...state,
        topQuestions: action.payload,
      };

    case GET_SOLVED_QUESTIONS:
      return {
        ...state,
        solvedQuestions: action.payload,
      };

    default:
      return state;
  }
};

export default questionReducer;
