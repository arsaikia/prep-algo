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
      <img alt="Error Icon" src={Error404Icon} />
      <h3>Oops! Looks like you&aposve hit a dead end!</h3>
      <Container width="30%">
        <button
          type="button"
          className="button-6"
          onClick={() => navigate('/')}
        >
          Go home ?
        </button>
      </Container>
    </CenteredFlex>
  );
}

export default Error;
