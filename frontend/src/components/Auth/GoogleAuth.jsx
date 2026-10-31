import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useDispatch, useSelector } from 'react-redux';
import { loginWithGoogle } from '../../actions/actions';
import { GoogleButtonContainer } from './loginStyles';

function GoogleAuth() {
  const dispatch = useDispatch();
  const { signingIn, error } = useSelector((state) => state.auth);
  const isDarkMode = useSelector((state) => state.theme.isDarkModeEnabled);
  const fail = (message) => dispatch({ type: 'GOOGLE_LOGIN_FAILURE', payload: message });
  return (
    <GoogleButtonContainer aria-busy={signingIn}>
      {!signingIn && <GoogleLogin
        onSuccess={({ credential }) => credential
          ? dispatch(loginWithGoogle(credential))
          : fail('Google did not return a credential. Please try again.')}
        onError={() => fail('Google sign-in failed. Please try again.')}
        theme={isDarkMode ? 'filled_black' : 'outline'}
        size="large"
        width={240}
        text="continue_with"
        shape="pill"
      />}
      {signingIn && <p role="status">Signing in…</p>}
      {error && <p role="alert">{String(error)}</p>}
    </GoogleButtonContainer>
  );
}

export default GoogleAuth;
