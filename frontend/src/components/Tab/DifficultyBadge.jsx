/* eslint-disable no-nested-ternary */
/* eslint-disable react/prop-types */
import React from 'react';

import { useWindowSize } from '@uidotdev/usehooks';

function DifficultyBadge(props) {
  const {
    text,
  } = props;

  const {
    // eslint-disable-next-line no-unused-vars
    width, height,
  } = useWindowSize();
  const isMobile = width < 768;

  if (isMobile) {
    return null;
  }

  return (
    <span style={
      {
        background: text === 'Easy' ? 'lightseagreen' : text === 'Medium' ? '#d5adcf' : 'indianred',
        borderRadius: '4px',
        color: 'white',
        marginLeft: '0.8rem',
        padding: '0.15rem 0.4rem',
      }
    }
    >
      {text}
    </span>
  );
}

export default DifficultyBadge;
