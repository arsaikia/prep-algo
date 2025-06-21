import React from 'react';
import styled from 'styled-components';
import { User } from 'react-feather';

const TestUserContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  font-size: 12px;
`;

const TestSelect = styled.select`
  padding: 4px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 12px;
  cursor: pointer;
  min-width: 160px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.brand.primary};
  }

  option {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const TestUserSelector = ({ selectedUserId, onUserChange, className }) => {
    // Test users data
    const testUsers = [
        { id: 'test-alice-beginner-001', name: 'Alice Beginner', description: 'Low completion, mostly easy' },
        { id: 'test-bob-intermediate-002', name: 'Bob Intermediate', description: 'Medium completion, mixed' },
        { id: 'test-carol-advanced-003', name: 'Carol Advanced', description: 'High completion, comprehensive' },
        { id: 'test-david-specialized-004', name: 'David Specialized', description: 'Uneven across topics' },
        { id: 'test-emma-struggling-005', name: 'Emma Struggling', description: 'High retry counts' },
        { id: 'test-user-123', name: 'Original Test User', description: 'Updated comprehensive history' }
    ];

    return (
        <TestUserContainer className={className}>
            <User size={14} />
            <TestSelect
                value={selectedUserId}
                onChange={(e) => onUserChange(e.target.value)}
            >
                {testUsers.map(user => (
                    <option key={user.id} value={user.id}>
                        {user.name}
                    </option>
                ))}
            </TestSelect>
        </TestUserContainer>
    );
};

export default TestUserSelector; 