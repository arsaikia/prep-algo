import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import DailyRecommendations from '../components/DailyRecommendations/DailyRecommendations';

// Styled components
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  text-align: center;
`;

const Subtitle = styled.p`
  color: #666;
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
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 12px 24px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  text-decoration: none;
  color: #333;
  
  &:hover {
    background-color: #e9ecef;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
`;

const Home = () => {
    const navigate = useNavigate();

    // TEST USER - Always signed in for development/testing
    const testUser = {
        userId: 'test-user-123',
        firstName: 'Test',
        lastName: 'User',
        isAuthenticated: true,
        picture: null
    };

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
            {testUser.userId && testUser.userId !== 'guest' && (
                <DailyRecommendations
                    userId={testUser.userId}
                    onQuestionSelect={handleQuestionSelect}
                />
            )}
        </Container>
    );
};

export default Home; 