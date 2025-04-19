/* eslint-disable default-param-last */
import {
  SET_DARK_MODE,
  SET_LIGHT_MODE,
} from '../actions/types';

const initialState = {
  isDarkModeEnabled: false,
};

const themeReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_DARK_MODE:
      return {
        ...state,
        isDarkModeEnabled: true,
      };

    case SET_LIGHT_MODE:
      return {
        ...state,
        isDarkModeEnabled: false,
      };

    default:
      return state;
  }
};

export default themeReducer;
