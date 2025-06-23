import React from 'react';
import styled from 'styled-components';
import { Settings, Eye, EyeOff } from 'react-feather';
import { isGodMode, enableGodMode, disableGodMode } from '../../utils/featureFlags';

const GodModeButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: ${({ $isActive, theme }) =>
    $isActive ? theme.colors.statusWarning : theme.colors.backgroundSecondary};
  border: 1px solid ${({ $isActive, theme }) =>
    $isActive ? theme.colors.statusWarning : theme.colors.border};
  border-radius: 4px;
  color: ${({ $isActive, theme }) =>
    $isActive ? '#000000' : theme.colors.textSecondary};
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &:hover {
    background: ${({ $isActive, theme }) =>
    $isActive ? theme.colors.statusWarning : theme.colors.backgroundTertiary};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

const GodModeToggle = ({ className }) => {
  const isActive = isGodMode();

  const handleToggle = () => {
    if (isActive) {
      disableGodMode();
    } else {
      enableGodMode();
    }
  };

  return (
    <GodModeButton
      $isActive={isActive}
      onClick={handleToggle}
      className={className}
      title={`Dev Mode: ${isActive ? 'Enabled' : 'Disabled'} - Click to toggle development features (test users, debug info, etc.)`}
    >
      {isActive ? <EyeOff size={12} /> : <Eye size={12} />}
      {isActive ? 'Dev Mode' : 'Dev Mode'}
    </GodModeButton>
  );
};

export default GodModeToggle; 