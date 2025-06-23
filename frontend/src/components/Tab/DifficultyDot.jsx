/* eslint-disable no-nested-ternary */
/* eslint-disable react/prop-types */
import React from 'react';
import { useTheme } from 'styled-components';

import { useWindowSize } from '@uidotdev/usehooks';
import { Tooltip } from 'react-tooltip';

import { CenteredFlex } from '../../styles';

function DifficultyDot(props) {
  const {
    id,
    text,
  } = props;

  const theme = useTheme();
  const {
    width,
    // eslint-disable-next-line no-unused-vars
    height,
  } = useWindowSize();
  const isMobile = width < 768;

  // Get difficulty color from theme
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy':
        return theme.colors.difficultyEasy;
      case 'Medium':
        return theme.colors.difficultyMedium;
      case 'Hard':
        return theme.colors.difficultyHard;
      default:
        return theme.colors.difficultyUnknown;
    }
  };

  const difficultyColor = getDifficultyColor(text);

  if (isMobile) {
    return (
      <div style={{
        background: difficultyColor,
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
          border: `0.2em solid ${difficultyColor}`,
          borderRadius: '50%',
          cursor: 'pointer',
          height: '0.8em',
          marginRight: '10px',
          width: '0.8em',
        }}
      >
        <div style={{
          background: difficultyColor,
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
