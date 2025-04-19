import React, {
    useEffect,
    useState,
    useCallback,
    useMemo,
} from 'react';

import {
    useSelector,
} from 'react-redux';
import styled from 'styled-components';

import FullScreenLoader from '../components/Loader/FullScreenLoader';
import {
    QuestionGroup,
    ListTabs,
} from '../components/questions';
import {
    getListNamesAndCounts,
    filterQuestionsByList,
    initializeExpandedState
} from '../utils/questions';

// Styled components
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: #666;
  margin-bottom: 2rem;
`;

const AllQuestions = () => {
    const {
        allQuestionsWithoutHistory,
        isFetchingQuestions,
    } = useSelector((state) => state.questions);

    // State to track expanded groups - initialize with all groups collapsed
    const [expandedGroups, setExpandedGroups] = useState({});

    // State to track active list tab
    const [activeList, setActiveList] = useState('TOP 150');

    // Initialize expanded state when groups are loaded
    useEffect(() => {
        if (allQuestionsWithoutHistory?.groups?.length) {
            setExpandedGroups(initializeExpandedState(allQuestionsWithoutHistory));
        }
    }, [allQuestionsWithoutHistory?.groups]);

    // Get all unique list names and their counts from questions
    const listNamesAndCounts = useMemo(() => {
        return getListNamesAndCounts(allQuestionsWithoutHistory);
    }, [allQuestionsWithoutHistory]);

    // Filter questions based on active list
    const filteredQuestions = useMemo(() => {
        return filterQuestionsByList(allQuestionsWithoutHistory, activeList);
    }, [allQuestionsWithoutHistory, activeList]);

    // Toggle group expansion - memoized with useCallback
    const toggleGroup = useCallback((groupName) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    }, []);

    // Show loading indicator when fetching questions
    if (isFetchingQuestions) {
        return <FullScreenLoader show={true} />;
    }

    return (
        <Container>
            <Title>All Questions</Title>
            <Subtitle>Browse and filter questions by list</Subtitle>

            <ListTabs
                listNamesAndCounts={listNamesAndCounts}
                activeList={activeList}
                onTabChange={setActiveList}
            />

            {allQuestionsWithoutHistory?.groups?.map((groupName) => {
                const questions = filteredQuestions[groupName] || [];
                if (questions.length === 0) return null;

                const isExpanded = expandedGroups[groupName] || false;

                return (
                    <QuestionGroup
                        key={groupName}
                        groupName={groupName}
                        questions={questions}
                        isExpanded={isExpanded}
                        onToggle={toggleGroup}
                    />
                );
            })}
        </Container>
    );
};

export default AllQuestions; 