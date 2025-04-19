/* eslint-disable default-param-last */
import {
  GOOGLE_LOGIN_SUCCESS,
  GOOGLE_LOGIN_FAILURE,
  LOGIN_SUCCESS,
  RESET_AUTH_SUCCESS,
  SIGNUP_SUCCESS,
  UPDATE_LAST_ACTIVITY,
  FETCH_USER_INFO_SUCCESS,
  FETCH_USER_INFO_FAILURE,
} from '../actions/types';

const initialState = {
  firstName: '',
  isAuthenticated: false,
  isSignedUp: false,
  lastName: '',
  userId: 'guest',
  picture: '',
  error: null,
  token: null,
  lastActivity: null,
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case SIGNUP_SUCCESS:
      return {
        ...state,
        ...action.payload,
        error: null,
        token: action.payload.token || null,
        lastActivity: Date.now(),
      };

    case LOGIN_SUCCESS:
      return {
        ...state,
        ...action.payload,
        error: null,
        token: action.payload.token || null,
        lastActivity: Date.now(),
      };

    case GOOGLE_LOGIN_SUCCESS:
      return {
        ...state,
        ...action.payload,
        isAuthenticated: true,
        userId: action.payload.id,
        error: null,
        token: action.payload.token || null,
        lastActivity: Date.now(),
      };

    case GOOGLE_LOGIN_FAILURE:
      return {
        ...state,
        isAuthenticated: false,
        error: action.payload,
        token: null,
      };

    case UPDATE_LAST_ACTIVITY:
      return {
        ...state,
        lastActivity: Date.now(),
      };

    case RESET_AUTH_SUCCESS:
      return {
        ...initialState,
      };

    case FETCH_USER_INFO_SUCCESS:
      return {
        ...state,
        ...action.payload,
        isAuthenticated: true,
        error: null,
        lastActivity: Date.now(),
      };

    case FETCH_USER_INFO_FAILURE:
      return {
        ...state,
        isAuthenticated: false,
        error: action.payload,
      };

    default:
      return state;
  }
};

export default authReducer;
