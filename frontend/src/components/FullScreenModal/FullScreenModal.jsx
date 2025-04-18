/* eslint-disable react/prop-types */
/* eslint-disable sort-keys */
/* eslint-disable no-unused-vars */
import React from 'react';

import {
  CenteredFlex, Container,
} from '../../styles';

function FullScreenModal({
  children,
}) {
  return (
    <>
      <CenteredFlex
        width="100vw"
        height="100vh"
        background="rgba(84, 110, 254, 1)"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 999999,
          opacity: 0.4,
        }}
      />
      <CenteredFlex
        width="100vw"
        height="100vh"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 999999,
        }}
      >
        {children}
      </CenteredFlex>
    </>
  );
}

export default FullScreenModal;
