import apiClient from './client.js';

export const getSmartDailyRecommendations = async (userId, options = {}) => {
    const { count = 5, forceRefresh = false } = options;

    const response = await apiClient.get(`/recommendations/${userId}/daily`, {
        params: { count, forceRefresh },
    });

    if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch smart recommendations');
    }

    return response.data.data;
};

export const markQuestionCompleted = async (userId, questionId, completionData = {}) => {
    const response = await apiClient.post(`/recommendations/${userId}/complete`, {
        questionId,
        ...completionData,
    });

    if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to mark question as completed');
    }

    return response.data.data;
};

export const replaceCompletedQuestions = async (userId) => {
    const response = await apiClient.post(`/recommendations/${userId}/replace-completed`);

    if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to replace completed questions');
    }

    return response.data.data;
};
