import React from 'react';

import './styles.css';
import GridLoader from './GridLoader';

function Loader(show) {
  if (!show) {
    return null;
  }
  return <GridLoader />;
}

export default Loader;
