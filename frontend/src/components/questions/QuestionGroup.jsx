import React from 'react';
import styled from 'styled-components';
import { ChevronDown, ChevronRight } from 'react-feather';
import QuestionTable from './QuestionTable';

// Styled components
const GroupContainer = styled.div`
  margin-bottom: 1.5rem;
  border-radius: 8px;
  overflow: visible;
  background-color: ${({ theme }) => theme.colors.background};
`;

const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  cursor: pointer;
  background-color: ${({ theme }) => theme.colors.backgroundSecondary};
  transition: all 0.2s ease;
  border-radius: 8px;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.backgroundTertiary};
  }
`;

const GroupTitleSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`;

const ExpandIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  transition: transform 0.2s ease;
`;

const GroupTitle = styled.h3`
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const QuestionCount = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.85rem;
  font-weight: 600;
`;

const CombinedCountBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.backgroundSecondary}, 
    ${({ theme }) => theme.colors.backgroundTertiary}
  );
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  min-width: 80px;
  justify-content: center;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
      transparent, 
      ${({ theme }) => theme.colors.primary}20, 
      transparent
    );
    transition: left 0.5s ease;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${({ theme }) => theme.colors.primary}20;
    border-color: ${({ theme }) => theme.colors.primary}40;
    
    &::before {
      left: 100%;
    }
  }
`;

const CountContent = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  width: 100%;
  justify-content: center;
`;

const CountDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: ${({ show }) => show ? 1 : 0};
  transform: ${({ show }) => show ? 'translateX(0)' : 'translateX(-10px)'};
  transition: all 0.3s ease;
  position: ${({ show }) => show ? 'static' : 'absolute'};
`;

const PercentageDisplay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${({ show }) => show ? 1 : 0};
  transform: ${({ show }) => show ? 'translateX(0)' : 'translateX(10px)'};
  transition: all 0.3s ease;
  position: ${({ show }) => show ? 'static' : 'absolute'};
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
`;

const SolvedNumber = styled.span`
  font-size: 16px;
  font-weight: 700;
      color: ${({ theme }) => theme.colors.difficultyEasy};
  line-height: 1;
`;

const Separator = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 0 2px;
`;

const TotalNumber = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  line-height: 1;
`;

const QuestionsContainer = styled.div`
  margin-top: 8px;
`;

const QuestionGroup = ({ groupName, questions, isExpanded, onToggle }) => {
  const [showTooltip, setShowTooltip] = React.useState(false);
  const solvedCount = questions.filter(question => question.solved).length;
  const totalCount = questions.length;
  const completionPercentage = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;

  return (
    <GroupContainer>
      <GroupHeader onClick={() => onToggle(groupName)}>
        <GroupTitleSection>
          <ExpandIcon>
            {isExpanded ? (
              <ChevronDown size={20} />
            ) : (
              <ChevronRight size={20} />
            )}
          </ExpandIcon>
          <GroupTitle>{groupName}</GroupTitle>
        </GroupTitleSection>
        <QuestionCount>
          <CombinedCountBadge
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <CountContent>
              <CountDisplay show={!showTooltip}>
                <SolvedNumber>{solvedCount}</SolvedNumber>
                <Separator>/</Separator>
                <TotalNumber>{totalCount}</TotalNumber>
              </CountDisplay>
              <PercentageDisplay show={showTooltip}>
                {completionPercentage}%
              </PercentageDisplay>
            </CountContent>
          </CombinedCountBadge>
        </QuestionCount>
      </GroupHeader>
      {isExpanded && (
        <QuestionsContainer>
          <QuestionTable questions={questions} />
        </QuestionsContainer>
      )}
    </GroupContainer>
  );
};

export default QuestionGroup; 