import React from 'react';

// eslint-disable-next-line import/no-extraneous-dependencies
import { func } from 'prop-types';
import styled from 'styled-components';

const Check = styled.div`
  display: inline-block;
  transform: rotate(45deg);
  height: 12px;
  width: 6px;
  border-bottom: 4px solid #99d18f;
  border-right: 4px solid #99d18f;

  &:hover {
    cursor: pointer;
    border-bottom: 4px solid #25d598;
    border-right: 4px solid #25d598;
  }
`;

const UnstyledButton = styled.button`
  border: none;
  background: none ;
  padding: 0;
  margin: 0;
`;

function GreenCheck({
  onClick,
}) {
  return (
    <UnstyledButton type="button" onClick={onClick}>
      <Check />
    </UnstyledButton>
  );
}

GreenCheck.propTypes = {
  onClick: func,
};

GreenCheck.defaultProps = {
  onClick: () => {},
};
export default GreenCheck;
