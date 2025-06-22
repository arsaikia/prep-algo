const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api/v1';

export const getSmartDailyRecommendations = async (userId, options = {}) => {
    try {
        const { count = 5, forceRefresh = false } = options;

        const queryParams = new URLSearchParams({
            count: count.toString(),
            forceRefresh: forceRefresh.toString()
        });

        const response = await fetch(
            `${API_BASE_URL}/smart-recommendations/${userId}/daily?${queryParams}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch smart recommendations');
        }

        return data.data;
    } catch (error) {
        console.error('Error fetching smart recommendations:', error);
        throw error;
    }
};

export const markQuestionCompleted = async (userId, questionId, completionData = {}) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/smart-recommendations/${userId}/complete`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    questionId,
                    ...completionData
                })
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to mark question as completed');
        }

        return data.data;
    } catch (error) {
        console.error('Error marking question completed:', error);
        throw error;
    }
}; 