import React from 'react';

import './styles.css';
import GridLoader from './GridLoader';

function FullScreenLoader(show) {
  if (!show) {
    return null;
  }

  return (
    <div style={{
      alignItems: 'center',
      display: 'flex',
      height: '80vh',
      justifyContent: 'center',
    }}
    >
      <GridLoader />
    </div>
  );
}

export default FullScreenLoader;
