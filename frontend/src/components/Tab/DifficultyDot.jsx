/* eslint-disable no-nested-ternary */
/* eslint-disable react/prop-types */
import React from 'react';

import { useWindowSize } from '@uidotdev/usehooks';
import { Tooltip } from 'react-tooltip';

import { CenteredFlex } from '../../styles';

function DifficultyDot(props) {
  const {
    id,
    text,
  } = props;

  const {
    width,
    // eslint-disable-next-line no-unused-vars
    height,
  } = useWindowSize();
  const isMobile = width < 768;

  if (isMobile) {
    return (
      <div style={{
        // eslint-disable-next-line no-nested-ternary
        background: text === 'Easy' ? 'lightseagreen' : text === 'Medium' ? '#6a5acd' : 'indianred',
        borderRadius: '50%',
        display: 'inline-block',
        height: '6px',
        marginRight: '10px',
        width: '6px',
      }}
      />
    );
  }

  return (
    <>
      <CenteredFlex
        data-tooltip-id={id}
        style={{
          border: `0.2em solid ${text === 'Easy' ? 'lightseagreen' : text === 'Medium' ? '#6a5acd' : 'indianred'}`,
          borderRadius: '50%',
          cursor: 'pointer',
          height: '0.8em',
          marginRight: '10px',
          width: '0.8em',
        }}
      >
        <div style={{
          background: text === 'Easy' ? 'lightseagreen' : text === 'Medium' ? '#6a5acd' : 'indianred',
          borderRadius: '50%',
          height: '0.45em',
          width: '0.45em',
        }}
        />
      </CenteredFlex>
      <Tooltip
        id={id}
        className="tooltip-z-idx"
        place="top"
        variant={text === 'Easy' ? 'success' : text === 'Medium' ? 'warning' : 'error'}
        content={text}
      />
    </>
  );
}

export default DifficultyDot;
