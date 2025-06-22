import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styled from 'styled-components';

import DailyRecommendations from '../components/DailyRecommendations/DailyRecommendations';
import { useTestUser } from '../contexts/TestUserContext';
import { isDevMode } from '../utils/featureFlags';

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

const UserDebugInfo = styled.div`
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 2rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  
  strong {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Home = () => {
  const navigate = useNavigate();
  const { selectedUserId } = useTestUser();

  // Get authenticated user from Redux store
  const authUser = useSelector(state => state.auth);
  const { isAuthenticated, userId: authUserId, firstName, email } = authUser;

  // Handle question selection from daily recommendations
  const handleQuestionSelect = useCallback((question) => {
    // Navigate to CodeSandbox with the selected question
    const questionLink = question.link || question.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/codesandbox?question=${questionLink}`);
  }, [navigate]);

  // Determine which user ID to use for recommendations
  const getUserIdForRecommendations = () => {
    // DEV MODE OVERRIDE: When dev mode is active and a test user is selected,
    // prioritize the test user over the authenticated user. This allows developers
    // to test different user scenarios even when they're logged in.
    if (isDevMode() && selectedUserId) {
      return selectedUserId;
    }

    // AUTHENTICATED USER: Use the real user's ID when they're properly logged in
    if (isAuthenticated && authUserId && authUserId !== 'guest') {
      return authUserId;
    }

    // LOGIN BUG FALLBACK: Handle edge case where userId is "guest" but 
    // we have the actual user ID in the 'id' field (from auth reducer bug)
    if (isAuthenticated && authUser.id) {
      return authUser.id;
    }

    // NO VALID USER: Return null if no authenticated or test user is available
    return null;
  };

  const recommendationUserId = getUserIdForRecommendations();

  return (
    <Container>
      <Title>🎯 Daily Problems</Title>
      <Subtitle>Smart recommendations tailored to accelerate your progress</Subtitle>

      <QuickLinks>
        <QuickLinkButton onClick={() => navigate('/all')}>
          📚 Browse All Questions
        </QuickLinkButton>
        <QuickLinkButton onClick={() => navigate('/codesandbox')}>
          💻 Code Sandbox
        </QuickLinkButton>
      </QuickLinks>



      {/* Daily Recommendations Section - Show for authenticated users OR test mode */}
      {recommendationUserId ? (
        <DailyRecommendations
          userId={recommendationUserId}
          onQuestionSelect={handleQuestionSelect}
        />
      ) : (
        <UserDebugInfo>
          <strong>Please log in to see personalized recommendations</strong>
        </UserDebugInfo>
      )}
    </Container>
  );
};

export default Home; 