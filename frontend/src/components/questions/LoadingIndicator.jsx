import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
`;

const LoadingText = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #1976d2;
`;

const Spinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #1976d2;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingIndicator = ({ message = 'Loading questions...' }) => {
    return (
        <Container>
            <LoadingText>{message}</LoadingText>
            <Spinner />
        </Container>
    );
};

export default LoadingIndicator; 