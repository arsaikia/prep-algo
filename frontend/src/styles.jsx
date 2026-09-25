/* eslint-disable react/jsx-filename-extension */
/* eslint-disable react/react-in-jsx-scope */
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
    width: ${({
    width,
  }) => width || 'auto'};
    max-width: ${({
    maxWidth,
  }) => maxWidth || 'auto'};
    min-width: ${({
    minWidth,
  }) => minWidth || 'auto'};
    height: ${({
    height,
  }) => height || 'auto'};
    min-height: ${({
    minHeight,
  }) => minHeight || 'auto'};
    background-color: ${({
    backgroundColor,
  }) => backgroundColor || 'none'};
    background: ${({
    background,
  }) => background || 'none'};
    z-index: ${({
    zindex,
  }) => zindex || 1};
    position: ${({
    position,
  }) => position || 'auto'};
    top: ${({
    top,
  }) => top || 'auto'};
    border: ${({
    border,
  }) => border || 'none'};
    padding: ${({
    padding,
  }) => padding || 'auto'};
    background: ${({
    background,
  }) => background && background};
    box-shadow: ${({
    boxShadow,
  }) => boxShadow || 'none'};
    overflow: ${({
    overflow,
  }) => overflow && overflow};
    overflow-x: ${({
    overflowX,
  }) => overflowX && overflowX};
    overflow-y: ${({
    overflowY,
  }) => overflowY && overflowY};
`;

const Flex = styled(Container)`
    display: flex;
    flex-direction: ${({
    direction,
  }) => direction || 'row'};
    justify-content: ${({
    justifyContent,
  }) => justifyContent && justifyContent};
    align-items: ${({
    alignItems,
  }) => alignItems && alignItems};
`;

function CenteredFlex(props) {
  return (
    <Flex
      justifyContent="center"
      alignItems="center"
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    />
  );
}

const StyledNavLink = styled(NavLink)`
    padding: ${({
    padding,
  }) => padding || 'auto'};
    text-decoration: none;
    color: inherit;

    &:focus, &:hover, &:visited, &:link, &:active {
    text-decoration: none;
}
`;

const UnstyledLink = styled.a`
    text-decoration: none;
    color: inherit;
    font-weight: 600;

    &:focus, &:hover, &:visited, &:link, &:active {
    text-decoration: none;
`;

const BlankButton = styled.button`
  background: none;
  color: inherit;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  outline: inherit;
`;

export {
  BlankButton,
  CenteredFlex,
  Container,
  Flex,
  StyledNavLink,
  UnstyledLink,
};
