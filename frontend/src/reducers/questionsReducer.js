/* eslint-disable default-param-last */
import {
  GET_ALL_QUESTIONS,
  GET_SOLVED_QUESTIONS,
  GET_TODAY_QUESTIONS,
  GET_TOP_QUESTIONS,
  HIDE_FETCH_LOADING,
  SHOW_FETCH_LOADING,
} from '../actions/types';

const initialState = {
  allQuestions: {
    groups: [],
    questions: {},
  },
  isFetchingQuestions: true,
  solvedQuestions: [],
  todoQuestions: [],
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

    case GET_TODAY_QUESTIONS:
      return {
        ...state,
        todoQuestions: action.payload,
      };

    default:
      return {
        ...state,
      };
  }
};

export default questionReducer;
