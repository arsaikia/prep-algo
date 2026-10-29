import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';

import DailyRecommendations from '../components/DailyRecommendations/DailyRecommendations';
import { useTestUser } from '../contexts/TestUserContext';
import { isDevMode } from '../utils/featureFlags';
import { requestSignIn } from '../utils/navigation';

// Styled components
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  min-height: 100vh;
  min-width: 0;
  box-sizing: border-box;
  @media (max-width: 480px) { padding: 12px 0; }
`;



const GuestBanner = styled.div`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.backgroundSecondary}, ${({ theme }) => theme.colors.background});
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const GuestBannerLink = styled.button`
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  text-align: left;
  color: ${({ theme }) => theme.colors.primary || '#7c3aed'};
  cursor: pointer;
  font-weight: 500;
  &:hover { text-decoration: underline; }
`;

const Home = () => {
  const { selectedUserId } = useTestUser();

  // Get authenticated user from Redux store
  const authUser = useSelector(state => state.auth);
  const { isAuthenticated, userId: authUserId } = authUser;

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

    // GUEST: Show default recommendations (read-only)
    return 'guest';
  };

  const recommendationUserId = getUserIdForRecommendations();
  const isGuest = recommendationUserId === 'guest';

  return (
    <Container>
      {isGuest && authUser.status === 'guest' && (
        <GuestBanner>
          <span>👋 Browsing as guest.</span>
          <GuestBannerLink onClick={requestSignIn}>
            Sign in to track progress and get personalized recommendations
          </GuestBannerLink>
        </GuestBanner>
      )}
      {['unknown', 'restoring'].includes(authUser.status) ? <p role="status">Restoring your session…</p> : <DailyRecommendations
        key={recommendationUserId}
        userId={recommendationUserId}
        isGuest={isGuest}
      />}
    </Container>
  );
};

export default Home; 