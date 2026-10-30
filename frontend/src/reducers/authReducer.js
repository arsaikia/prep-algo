/* eslint-disable default-param-last */
import {
  GOOGLE_LOGIN_SUCCESS,
  GOOGLE_LOGIN_FAILURE,
  LOGIN_SUCCESS,
  RESET_AUTH_SUCCESS,
  UPDATE_LAST_ACTIVITY,
  FETCH_USER_INFO_SUCCESS,
  FETCH_USER_INFO_FAILURE,
  FETCH_USER_INFO,
  GOOGLE_LOGIN,
} from '../actions/types.js';

const initialState = {
  firstName: '',
  isAuthenticated: false,
  lastName: '',
  userId: 'guest',
  picture: '',
  error: null,
  token: null,
  lastActivity: null,
  status: 'unknown',
  signingIn: false,
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'AUTH_GUEST':
      return { ...initialState, status: 'guest' };
    case 'AUTH_EXPIRED':
      return { ...initialState, status: 'guest', error: 'Your session expired. Sign in again to continue.' };
    case FETCH_USER_INFO:
      return { ...state, status: 'restoring', error: null };
    case GOOGLE_LOGIN:
      return { ...state, signingIn: true, error: null };
    case LOGIN_SUCCESS:
      return {
        ...state,
        ...action.payload,
        status: 'authenticated',
        isAuthenticated: true,
        error: null,
        token: action.payload.token || null,
        lastActivity: Date.now(),
      };

    case GOOGLE_LOGIN_SUCCESS:
      if (!state.signingIn) return state;
      return {
        ...state,
        ...action.payload,
        isAuthenticated: true,
        status: 'authenticated',
        signingIn: false,
        error: null,
        token: action.payload.token || null,
        lastActivity: Date.now(),
        userId: action.payload.id || action.payload._id || action.payload.userId,
      };

    case GOOGLE_LOGIN_FAILURE:
      return {
        ...initialState,
        status: 'guest',
        signingIn: false,
        error: action.payload,
      };

    case UPDATE_LAST_ACTIVITY:
      return {
        ...state,
        lastActivity: Date.now(),
      };

    case RESET_AUTH_SUCCESS:
      return {
        ...initialState,
        status: 'guest',
      };

    // The user endpoint returns the identifier as `id`, so spreading the
    // payload alone leaves `userId` at its 'guest' default — which reads as
    // "signed in, but with no history" on every page load after login.
    case FETCH_USER_INFO_SUCCESS:
      if (state.status !== 'restoring' || state.signingIn) return state;
      return {
        ...state,
        ...action.payload,
        isAuthenticated: true,
        status: 'authenticated',
        signingIn: false,
        error: null,
        lastActivity: Date.now(),
        userId: action.payload.id || action.payload._id || action.payload.userId,
      };

    case FETCH_USER_INFO_FAILURE:
      if (state.status !== 'restoring' || state.signingIn) return state;
      return {
        ...initialState,
        status: 'guest',
        error: action.payload,
      };

    default:
      return state;
  }
};

export default authReducer;
