/* eslint-disable default-param-last */
/* eslint-disable sort-keys */
import {
  CLOSE_CODE_MODAL_SUCCESS, FETCH_CODE_ERROR, FETCH_CODE_SUCCESS, HIDE_LOADING, SHOW_LOADING, SHOW_CODE_MODAL,
} from '../actions/types';

const initialState = {
  showLoading: false,
  showCodeModal: false,
  selectedQuestionId: '',
  codes: [],
};

const codeModalReducer = (state = initialState, action) => {
  switch (action.type) {
    case SHOW_CODE_MODAL:
      return {
        ...state,
        showCodeModal: true,
        selectedQuestionId: action.payload.questionId,
      };

    case CLOSE_CODE_MODAL_SUCCESS:
      return {
        ...state,
        showLoading: false,
        showCodeModal: false,
        selectedQuestionId: '',
      };

    case FETCH_CODE_SUCCESS:
      return {
        ...state,
        codes: [...state.codes, action.payload],
      };

    case FETCH_CODE_ERROR:
      return {
        ...state,
        codes: [...state.codes, action.payload],
      };

    case SHOW_LOADING:
      return {
        ...state,
        showLoading: true,
      };

    case HIDE_LOADING:
      return {
        ...state,
        showLoading: false,
      };

    default:
      return {
        ...state,
      };
  }
};

export default codeModalReducer;
