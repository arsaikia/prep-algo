import React from 'react';

import { useNavigate } from 'react-router-dom';

import Error404Icon from './errorIcon.png';
import {
  CenteredFlex, Container,
} from '../../styles';

function Error() {
  const navigate = useNavigate();

  return (
    <CenteredFlex
      direction="column"
      width="100%"
      height="90vh"
    >
      <img alt="" src={Error404Icon} style={{ maxWidth: '100%' }} />
      <h1>Page not found</h1>
      <p>That page does not exist. Browse from the home page to continue.</p>
      <Container width="min(100%, 240px)">
        <button
          type="button"
          className="button-6"
          onClick={() => navigate('/')}
        >
          Go home
        </button>
      </Container>
    </CenteredFlex>
  );
}

export default Error;
