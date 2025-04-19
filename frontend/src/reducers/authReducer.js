/* eslint-disable default-param-last */
import {
  GOOGLE_LOGIN_SUCCESS,
  LOGIN_SUCCESS, RESET_AUTH_SUCCESS, SIGNUP_SUCCESS,
} from '../actions/types';

const initialState = {
  firstName: '',
  isAuthenticated: false,
  isSignedUp: false,
  lastName: '',
  userId: 'guest',
  picture: '',
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

    case GOOGLE_LOGIN_SUCCESS:
      return {
        ...state,
        ...action.payload,
        isAuthenticated: true,
        userId: action.payload.googleId,
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
