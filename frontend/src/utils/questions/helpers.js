/**
 * Get list names and their counts from questions data
 * @param {Object} questionsData - The questions data object
 * @returns {Array} Array of objects with name and count properties
 */
export const getListNamesAndCounts = (questionsData) => {
    if (!questionsData?.groups?.length) return [{ name: 'All', count: 0 }];

    const lists = new Map();

    // Count total unique questions and collect lists
    const uniqueQuestions = new Set();
    questionsData.groups.forEach(group => {
        const questions = questionsData.questions[group] || [];
        questions.forEach(question => {
            uniqueQuestions.add(question._id);
            if (question.list && question.list.length > 0) {
                question.list.forEach(list => {
                    if (list !== 'All') { // Skip if list name is 'All'
                        const currentCount = lists.get(list) || 0;
                        lists.set(list, currentCount + 1);
                    }
                });
            }
        });
    });

    // Convert to array and sort by count
    const sortedLists = Array.from(lists.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => {
            // Sort by count in descending order
            const countDiff = b.count - a.count;
            if (countDiff !== 0) return countDiff;
            // If counts are equal, sort alphabetically
            return a.name.localeCompare(b.name);
        });

    return [...sortedLists];
};

/**
 * Filter questions based on active list
 * @param {Object} questionsData - The questions data object
 * @param {string} activeList - The currently selected list
 * @returns {Object} Filtered questions object
 */
export const filterQuestionsByList = (questionsData, activeList) => {
    if (!questionsData?.groups?.length) return {};
    if (activeList === 'All') return questionsData.questions;

    const filtered = {};
    questionsData.groups.forEach(group => {
        const questions = questionsData.questions[group] || [];
        const filteredGroupQuestions = questions.filter(question =>
            question.list && question.list.includes(activeList)
        );
        if (filteredGroupQuestions.length > 0) {
            filtered[group] = filteredGroupQuestions;
        }
    });
    return filtered;
};

/**
 * Initialize expanded state for question groups
 * @param {Object} questionsData - The questions data object
 * @returns {Object} Initial expanded state object
 */
export const initializeExpandedState = (questionsData) => {
    if (!questionsData?.groups?.length) return {};

    const initialExpandedState = {};
    questionsData.groups.forEach(group => {
        initialExpandedState[group] = false;
    });
    return initialExpandedState;
};

/**
 * Format LeetCode URL for a question
 * @param {Object} question - The question object
 * @returns {string} Formatted LeetCode URL
 */
export const formatLeetCodeUrl = (question) => {
    if (question.link && question.link.includes('leetcode.com')) {
        return question.link;
    }
    return `https://leetcode.com/problems/${question.name.toLowerCase().replace(/\s+/g, '-')}/`;
}; 