import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import DailyRecommendations from '../components/DailyRecommendations/DailyRecommendations';
import { useTestUser } from '../contexts/TestUserContext';

// Styled components
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  min-height: 100vh;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 3rem;
  text-align: center;
  font-size: 1.1rem;
`;

const QuickLinks = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;
`;

const QuickLinkButton = styled.button`
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 12px 24px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text};
  
  &:hover {
    background: ${({ theme }) => theme.colors.backgroundHover};
    border-color: ${({ theme }) => theme.colors.brand.primary};
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.colors.shadows.button};
  }
  
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.brand.primary};
    outline-offset: 2px;
  }
`;

const Home = () => {
  const navigate = useNavigate();
  const { selectedUserId, isTestMode } = useTestUser();

  // Handle question selection from daily recommendations
  const handleQuestionSelect = useCallback((question) => {
    // Navigate to CodeSandbox with the selected question
    const questionLink = question.link || question.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/codesandbox?question=${questionLink}`);
  }, [navigate]);

  return (
    <Container>
      <Title>🎯 PrepAlgo</Title>
      <Subtitle>Your personalized coding practice recommendations</Subtitle>

      <QuickLinks>
        <QuickLinkButton onClick={() => navigate('/all')}>
          📚 Browse All Questions
        </QuickLinkButton>
        <QuickLinkButton onClick={() => navigate('/codesandbox')}>
          💻 Code Sandbox
        </QuickLinkButton>
      </QuickLinks>

      {/* Daily Recommendations Section */}
      {isTestMode && selectedUserId && (
        <DailyRecommendations
          userId={selectedUserId}
          onQuestionSelect={handleQuestionSelect}
        />
      )}
    </Container>
  );
};

export default Home; 