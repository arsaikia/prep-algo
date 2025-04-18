/* eslint-disable default-param-last */
import {
  LOGIN_SUCCESS, RESET_AUTH_SUCCESS, SIGNUP_SUCCESS,
} from '../actions/types';

const initialState = {
  firstName: '',
  isAuthenticated: false,
  isSignedUp: false,
  lastName: '',
  userId: 'guest',
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case SIGNUP_SUCCESS:
      return {
        ...state,
        ...action.payload,
      };

    case LOGIN_SUCCESS:
      return {
        ...state,
        ...action.payload,
      };
    case RESET_AUTH_SUCCESS:
      return {
        ...initialState,
      };

    default:
      return {
        ...state,
      };
  }
};

export default authReducer;
