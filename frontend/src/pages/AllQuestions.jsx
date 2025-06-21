import React, {
    useEffect,
    useState,
    useCallback,
    useMemo,
} from 'react';

import {
    useSelector,
    useDispatch,
} from 'react-redux';
import styled from 'styled-components';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'react-feather';

import FullScreenLoader from '../components/Loader/FullScreenLoader';
import {
    QuestionGroup,
    ListTabs,
} from '../components/questions';
import {
    getListNamesAndCounts,
    filterQuestionsByList,
} from '../utils/questions';
import { getQuestions } from '../actions/actions';
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

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 2rem;
  font-size: 1.1rem;
`;

const TabsCardContainer = styled.div`
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 20px;
  box-shadow: ${({ theme }) => theme.colors.shadows.card};
  transition: all 0.3s ease;
  margin-bottom: 2rem;
  
  &:hover {
    box-shadow: ${({ theme }) => theme.colors.shadows.cardHover};
    transform: translateY(-1px);
  }
`;

const TabsAndStatsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
`;

const TabsSection = styled.div`
  flex-shrink: 0;
  max-width: fit-content;
`;

const StatsSection = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 24px;
`;

const CircularProgress = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: conic-gradient(
    ${({ theme, percentage }) => theme.colors.brand.primary} ${props => props.percentage * 3.6}deg,
    ${({ theme }) => theme.colors.backgroundTertiary} ${props => props.percentage * 3.6}deg
  );
  display: flex;
  align-items: center;
  justify-content: center;
  
  &::before {
    content: '';
    position: absolute;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.backgroundSecondary};
  }
`;

const CircularProgressContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const CircularProgressNumber = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.brand.primary};
  line-height: 1;
`;

const CircularProgressLabel = styled.span`
  font-size: 10px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px;
  background: ${({ theme }) => theme.colors.background};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.background};
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.border};
    border-radius: 2px;
  }
`;

const Tab = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  background: ${props => props.isActive
        ? `linear-gradient(135deg, ${props.theme.colors.brand.primary}, ${props.theme.colors.brand.secondary || props.theme.colors.brand.primary}dd)`
        : 'transparent'
    };
  color: ${props => props.isActive ? '#ffffff' : props.theme.colors.text};
  cursor: pointer;
  font-size: 14px;
  font-weight: ${props => props.isActive ? '600' : '500'};
  white-space: nowrap;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => props.isActive
        ? 'transparent'
        : `linear-gradient(135deg, ${props.theme.colors.brand.primary}10, ${props.theme.colors.brand.secondary || props.theme.colors.brand.primary}05)`
    };
    opacity: 0;
    transition: opacity 0.3s ease;
    border-radius: 8px;
  }

  &:hover:before {
    opacity: ${props => props.isActive ? 0 : 1};
  }

  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: ${props => props.isActive
        ? `0 12px 30px ${props.theme.colors.brand.primary}50`
        : `0 6px 20px ${props.theme.colors.brand.primary}25`
    };
  }

  &:active {
    transform: translateY(-1px) scale(1.01);
  }

  .tab-icon {
    font-size: 16px;
    filter: ${props => props.isActive ? 'brightness(1.2)' : 'none'};
    transition: transform 0.3s ease;
  }

  &:hover .tab-icon {
    transform: scale(1.1) rotate(5deg);
  }

  .tab-name {
    font-size: 14px;
    font-weight: 500;
    color: ${props => props.isActive ? '#ffffff' : props.theme.colors.text};
    transition: color 0.3s ease;
  }

  .tab-count {
    background: ${props => props.isActive
        ? 'rgba(255, 255, 255, 0.25)'
        : props.theme.colors.backgroundTertiary
    };
    color: ${props => props.isActive ? '#ffffff' : props.theme.colors.textSecondary};
    padding: 3px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 700;
    min-width: 24px;
    text-align: center;
    border: 1px solid ${props => props.isActive
        ? 'rgba(255, 255, 255, 0.3)'
        : props.theme.colors.border
    };
    transition: all 0.3s ease;
    backdrop-filter: blur(4px);
  }

  &:hover .tab-count {
    transform: scale(1.05);
    background: ${props => props.isActive
        ? 'rgba(255, 255, 255, 0.3)'
        : props.theme.colors.brand.primary + '15'
    };
  }
`;

const FiltersContainer = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 2rem;
  align-items: center;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 20px;
  box-shadow: ${({ theme }) => theme.colors.shadows.card};
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
`;

const FiltersRow = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: nowrap;
  justify-content: space-between;
  width: 100%;
  
  @media (max-width: 768px) {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
`;

const LeftFilters = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  flex: 1;
`;

const RightActions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-shrink: 0;
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  overflow: visible;
`;

const SearchInput = styled.input`
  padding: 12px 16px 12px 44px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
  transition: all 0.2s ease;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.brand.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.brand.primary}20;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.textMuted};
  width: 18px;
  height: 18px;
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
  min-width: fit-content;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
    justify-content: flex-start;
    width: 100%;
  }
`;

const FilterLabel = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  flex-shrink: 0;
  min-width: fit-content;
`;

const DifficultyFilter = styled.button`
  padding: 6px 12px;
  border: 2px solid ${({ theme, isActive }) =>
        isActive ? theme.colors.brand.primary : theme.colors.border};
  border-radius: 6px;
  background: ${({ theme, isActive }) =>
        isActive ? theme.colors.brand.primary : theme.colors.background};
  color: ${({ theme, isActive }) =>
        isActive ? '#ffffff' : theme.colors.text};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.brand.primary};
    background: ${({ theme, isActive }) =>
        isActive ? theme.colors.brand.primary : theme.colors.backgroundHover};
  }
`;

const StatsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 2rem;
  padding: 20px;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.colors.shadows.card};
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: ${({ theme }) => theme.colors.shadows.cardHover};
    transform: translateY(-1px);
  }
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
  }
`;

const TotalStat = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: ${({ theme }) => theme.colors.brand.primary}10;
  border: 2px solid ${({ theme }) => theme.colors.brand.primary}20;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.brand.primary}15;
    border-color: ${({ theme }) => theme.colors.brand.primary}30;
  }
`;

const TotalNumber = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.brand.primary};
`;

const TotalLabel = styled.span`
  font-size: 0.9rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const DifficultyStats = styled.div`
  display: flex;
  gap: 20px;
  flex: 1;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const DifficultyItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 80px;
`;

const DifficultyHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
`;

const DifficultyLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme, difficulty }) => {
        switch (difficulty) {
            case 'easy':
                return theme.colors.difficulty.easy;
            case 'medium':
                return theme.colors.difficulty.medium;
            case 'hard':
                return theme.colors.difficulty.hard;
            default:
                return theme.colors.text;
        }
    }};
`;

const DifficultyCount = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: ${({ theme }) => theme.colors.backgroundTertiary};
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${({ theme, difficulty }) => {
        switch (difficulty) {
            case 'easy':
                return theme.colors.difficulty.easy;
            case 'medium':
                return theme.colors.difficulty.medium;
            case 'hard':
                return theme.colors.difficulty.hard;
            default:
                return theme.colors.brand.primary;
        }
    }};
  width: ${({ percentage }) => percentage}%;
  transition: width 0.3s ease;
  border-radius: 2px;
`;

const CompletionLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: 500;
  text-align: center;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
`;

const EmptyStateIcon = styled.span`
  font-size: 48px;
  margin-bottom: 16px;
`;

const EmptyStateTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.text};
`;

const EmptyStateText = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0;
`;

const ClearFiltersButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  white-space: nowrap;

  &:hover {
    border-color: ${({ theme }) => theme.colors.brand.primary};
    color: ${({ theme }) => theme.colors.brand.primary};
  }
  
  @media (max-width: 768px) {
    margin-top: 8px;
    align-self: flex-start;
  }
`;

const ExpandAllButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 2px solid ${({ theme }) => theme.colors.brand.primary};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.brand.primary};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.brand.primary};
    color: #ffffff;
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.colors.shadows.button};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.brand.primary};
    outline-offset: 2px;
  }
`;

const ContentSection = styled.div`
  margin-bottom: 2rem;
`;

const QuestionsContainer = styled.div`
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 20px;
  box-shadow: ${({ theme }) => theme.colors.shadows.card};
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: ${({ theme }) => theme.colors.shadows.cardHover};
  }
`;

const AllQuestions = () => {
    const dispatch = useDispatch();
    const {
        allQuestions,
        isFetchingQuestions,
    } = useSelector((state) => state.questions);

    // Get selected user from context
    const { selectedUserId } = useTestUser();

    // State to track active list tab
    const [activeList, setActiveList] = useState('TOP 150');

    // State for search and filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('All');

    // State to track expanded groups
    const [expandedGroups, setExpandedGroups] = useState({});

    // Fetch questions with user data when component mounts or user changes
    useEffect(() => {
        dispatch(getQuestions(selectedUserId));
    }, [dispatch, selectedUserId]);

    // Get all unique list names and their counts from questions
    const listNamesAndCounts = useMemo(() => {
        // Check if we have the correct data structure
        if (!allQuestions?.questions) {
            return {};
        }
        return getListNamesAndCounts(allQuestions);
    }, [allQuestions]);

    // Filter questions based on active list
    const filteredQuestions = useMemo(() => {
        // Check if we have the correct data structure
        if (!allQuestions?.questions) {
            return {};
        }
        return filterQuestionsByList(allQuestions, activeList);
    }, [allQuestions, activeList]);

    // Apply search and difficulty filters
    const finalFilteredQuestions = useMemo(() => {
        const result = {};

        Object.keys(filteredQuestions).forEach(groupName => {
            const groupQuestions = filteredQuestions[groupName] || [];

            const filtered = groupQuestions.filter(question => {
                // Search filter
                const matchesSearch = !searchTerm ||
                    question.name.toLowerCase().includes(searchTerm.toLowerCase());

                // Difficulty filter
                const matchesDifficulty = selectedDifficulty === 'All' ||
                    question.difficulty === selectedDifficulty;

                return matchesSearch && matchesDifficulty;
            });

            if (filtered.length > 0) {
                result[groupName] = filtered;
            }
        });

        return result;
    }, [filteredQuestions, searchTerm, selectedDifficulty]);

    // Calculate stats with real completion data
    const stats = useMemo(() => {
        const allQuestions = Object.values(finalFilteredQuestions).flat();
        const totalQuestions = allQuestions.length;
        const easyCount = allQuestions.filter(q => q.difficulty === 'Easy').length;
        const mediumCount = allQuestions.filter(q => q.difficulty === 'Medium').length;
        const hardCount = allQuestions.filter(q => q.difficulty === 'Hard').length;

        // Calculate actual completion based on solved questions
        const easyCompleted = allQuestions.filter(q => q.difficulty === 'Easy' && q.solved).length;
        const mediumCompleted = allQuestions.filter(q => q.difficulty === 'Medium' && q.solved).length;
        const hardCompleted = allQuestions.filter(q => q.difficulty === 'Hard' && q.solved).length;
        const totalCompleted = easyCompleted + mediumCompleted + hardCompleted;

        const easyCompletionPercentage = easyCount > 0 ? Math.round((easyCompleted / easyCount) * 100) : 0;
        const mediumCompletionPercentage = mediumCount > 0 ? Math.round((mediumCompleted / mediumCount) * 100) : 0;
        const hardCompletionPercentage = hardCount > 0 ? Math.round((hardCompleted / hardCount) * 100) : 0;
        const totalCompletionPercentage = totalQuestions > 0 ? Math.round((totalCompleted / totalQuestions) * 100) : 0;

        return {
            totalQuestions,
            totalCompleted,
            totalCompletionPercentage,
            easyCount,
            mediumCount,
            hardCount,
            easyCompleted,
            mediumCompleted,
            hardCompleted,
            easyCompletionPercentage,
            mediumCompletionPercentage,
            hardCompletionPercentage
        };
    }, [finalFilteredQuestions]);

    // Handle difficulty filter change
    const handleDifficultyFilter = useCallback((difficulty) => {
        setSelectedDifficulty(prev => prev === difficulty ? 'All' : difficulty);
    }, []);

    // Toggle group expansion
    const toggleGroup = useCallback((groupName) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    }, []);

    // Expand or collapse all groups
    const toggleAllGroups = useCallback(() => {
        const allGroupNames = Object.keys(finalFilteredQuestions);
        const allExpanded = allGroupNames.every(name => expandedGroups[name]);

        if (allExpanded) {
            // Collapse all
            setExpandedGroups({});
        } else {
            // Expand all
            const newState = {};
            allGroupNames.forEach(name => {
                newState[name] = true;
            });
            setExpandedGroups(newState);
        }
    }, [finalFilteredQuestions, expandedGroups]);

    // Check if all groups are expanded
    const allGroupsExpanded = useMemo(() => {
        const allGroupNames = Object.keys(finalFilteredQuestions);
        return allGroupNames.length > 0 && allGroupNames.every(name => expandedGroups[name]);
    }, [finalFilteredQuestions, expandedGroups]);

    // Auto-expand groups when search is active (better UX for searching)
    const shouldShowExpanded = useCallback((groupName) => {
        // If there's a search term or difficulty filter, auto-expand for better visibility
        if (searchTerm || selectedDifficulty !== 'All') {
            return true;
        }
        // Otherwise, use the manual expand/collapse state
        return expandedGroups[groupName] || false;
    }, [searchTerm, selectedDifficulty, expandedGroups]);

    // Show loading indicator when fetching questions
    if (isFetchingQuestions) {
        return <FullScreenLoader show={true} />;
    }

    return (
        <Container>
            <Header>
                <Title>📚 All Questions</Title>
                <Subtitle>Browse and filter questions by list</Subtitle>
            </Header>

            <ContentSection>
                <TabsCardContainer>
                    <TabsAndStatsHeader>
                        <TabsSection>
                            <TabsContainer>
                                {listNamesAndCounts.map(({ name, count }) => {
                                    // Get icon and display name for each tab
                                    const getTabInfo = (tabName) => {
                                        switch (tabName.toUpperCase()) {
                                            case 'TOP 150':
                                                return { icon: '🏆', displayName: 'Top 150', description: 'Most Popular' };
                                            case 'BLIND 75':
                                                return { icon: '🎯', displayName: 'Blind 75', description: 'Essential' };
                                            case 'NEETCODE 150':
                                                return { icon: '🚀', displayName: 'NeetCode 150', description: 'Comprehensive' };
                                            case 'LEETCODE 75':
                                                return { icon: '⚡', displayName: 'LeetCode 75', description: 'Study Plan' };
                                            case 'GRIND 75':
                                                return { icon: '💎', displayName: 'Grind 75', description: 'Curated' };
                                            case 'ALL':
                                                return { icon: '📚', displayName: 'All Questions', description: 'Complete' };
                                            default:
                                                return { icon: '📝', displayName: tabName, description: 'Collection' };
                                        }
                                    };

                                    const tabInfo = getTabInfo(name);

                                    return (
                                        <Tab
                                            key={name}
                                            isActive={activeList === name}
                                            onClick={() => setActiveList(name)}
                                            title={`${tabInfo.displayName} - ${tabInfo.description} (${count} questions)`}
                                        >
                                            <span className="tab-icon">{tabInfo.icon}</span>
                                            <span className="tab-name">{tabInfo.displayName}</span>
                                            <span className="tab-count">{count}</span>
                                        </Tab>
                                    );
                                })}
                            </TabsContainer>
                        </TabsSection>

                        <StatsSection>
                            <CircularProgress percentage={stats.totalCompletionPercentage}>
                                <CircularProgressContent>
                                    <CircularProgressNumber>{stats.totalCompletionPercentage}%</CircularProgressNumber>
                                    <CircularProgressLabel>Total</CircularProgressLabel>
                                </CircularProgressContent>
                            </CircularProgress>

                            <DifficultyStats>
                                <DifficultyItem>
                                    <DifficultyHeader>
                                        <DifficultyLabel difficulty="easy">Easy</DifficultyLabel>
                                        <DifficultyCount>{stats.easyCount}</DifficultyCount>
                                    </DifficultyHeader>
                                    <ProgressBar>
                                        <ProgressFill difficulty="easy" percentage={stats.easyCompletionPercentage} />
                                    </ProgressBar>
                                    <CompletionLabel>
                                        {stats.easyCompleted}/{stats.easyCount} solved
                                    </CompletionLabel>
                                </DifficultyItem>
                                <DifficultyItem>
                                    <DifficultyHeader>
                                        <DifficultyLabel difficulty="medium">Medium</DifficultyLabel>
                                        <DifficultyCount>{stats.mediumCount}</DifficultyCount>
                                    </DifficultyHeader>
                                    <ProgressBar>
                                        <ProgressFill difficulty="medium" percentage={stats.mediumCompletionPercentage} />
                                    </ProgressBar>
                                    <CompletionLabel>
                                        {stats.mediumCompleted}/{stats.mediumCount} solved
                                    </CompletionLabel>
                                </DifficultyItem>
                                <DifficultyItem>
                                    <DifficultyHeader>
                                        <DifficultyLabel difficulty="hard">Hard</DifficultyLabel>
                                        <DifficultyCount>{stats.hardCount}</DifficultyCount>
                                    </DifficultyHeader>
                                    <ProgressBar>
                                        <ProgressFill difficulty="hard" percentage={stats.hardCompletionPercentage} />
                                    </ProgressBar>
                                    <CompletionLabel>
                                        {stats.hardCompleted}/{stats.hardCount} solved
                                    </CompletionLabel>
                                </DifficultyItem>
                            </DifficultyStats>
                        </StatsSection>
                    </TabsAndStatsHeader>
                </TabsCardContainer>
            </ContentSection>

            <ContentSection>
                <FiltersContainer>
                    <FiltersRow>
                        <LeftFilters>
                            <SearchContainer>
                                <SearchIcon />
                                <SearchInput
                                    type="text"
                                    placeholder="Search questions..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </SearchContainer>
                            <FilterGroup>
                                <FilterLabel>
                                    <Filter size={16} />
                                </FilterLabel>
                                <DifficultyFilter
                                    isActive={selectedDifficulty === 'Easy'}
                                    onClick={() => handleDifficultyFilter('Easy')}
                                >
                                    Easy
                                </DifficultyFilter>
                                <DifficultyFilter
                                    isActive={selectedDifficulty === 'Medium'}
                                    onClick={() => handleDifficultyFilter('Medium')}
                                >
                                    Medium
                                </DifficultyFilter>
                                <DifficultyFilter
                                    isActive={selectedDifficulty === 'Hard'}
                                    onClick={() => handleDifficultyFilter('Hard')}
                                >
                                    Hard
                                </DifficultyFilter>
                            </FilterGroup>
                        </LeftFilters>

                        <RightActions>
                            {/* Show expand/collapse button only when not searching/filtering */}
                            {!searchTerm && selectedDifficulty === 'All' && Object.keys(finalFilteredQuestions).length > 0 && (
                                <ExpandAllButton onClick={toggleAllGroups}>
                                    {allGroupsExpanded ? (
                                        <>
                                            <ChevronUp size={16} />
                                            Collapse All
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown size={16} />
                                            Expand All
                                        </>
                                    )}
                                </ExpandAllButton>
                            )}

                            {(searchTerm || selectedDifficulty !== 'All') && (
                                <ClearFiltersButton
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSelectedDifficulty('All');
                                    }}
                                >
                                    <X size={14} />
                                    Clear Filters
                                </ClearFiltersButton>
                            )}
                        </RightActions>
                    </FiltersRow>
                </FiltersContainer>
            </ContentSection>

            {Object.keys(finalFilteredQuestions).length === 0 ? (
                <EmptyState>
                    <EmptyStateIcon>🔍</EmptyStateIcon>
                    <EmptyStateTitle>No questions found</EmptyStateTitle>
                    <EmptyStateText>
                        {searchTerm || selectedDifficulty !== 'All'
                            ? 'Try adjusting your search or filter criteria'
                            : 'No questions available for the selected list'
                        }
                    </EmptyStateText>
                </EmptyState>
            ) : (
                <QuestionsContainer>
                    {Object.keys(finalFilteredQuestions).map((groupName) => (
                        <QuestionGroup
                            key={groupName}
                            groupName={groupName}
                            questions={finalFilteredQuestions[groupName]}
                            isExpanded={shouldShowExpanded(groupName)}
                            onToggle={() => toggleGroup(groupName)}
                            showToggle={!searchTerm && selectedDifficulty === 'All'}
                        />
                    ))}
                </QuestionsContainer>
            )}
        </Container>
    );
};

export default AllQuestions; 
