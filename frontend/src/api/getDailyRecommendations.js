import apiClient from './client.js';

export const getDailyRecommendations = async (userId, count = 5) => {
    const response = await apiClient.get(`/solveHistory/${userId}/daily-recommendations`, {
        params: { count },
    });
    return response.data;
};

export const getAdaptiveDailyRecommendations = async (userId, count = 5) => {
    try {
        const response = await apiClient.get(`/adaptive-recommendations/${userId}/daily`, {
            params: { count },
        });
        return response.data;
    } catch (error) {
        console.warn('Falling back to original recommendations...');
        return getDailyRecommendations(userId, count);
    }
};

export const updateSolveHistory = async (userId, questionId) => {
    const response = await apiClient.post('/solveHistory', { userId, questionId });
    return response.data;
};

export const updateSolveHistoryWithContext = async (sessionData) => {
    const response = await apiClient.post('/solveHistory', {
        userId: sessionData.userId,
        questionId: sessionData.questionId,
        timeSpent: sessionData.timeSpent,
        difficultyRating: sessionData.difficultyRating,
        tags: sessionData.tags,
        success: sessionData.success,
        strategy: sessionData.strategy,
        sessionNumber: sessionData.sessionNumber,
        previousQuestionResult: sessionData.previousQuestionResult,
    });
    return response.data;
};

export const updateAdaptiveProfile = async (userId, questionResult) => {
    try {
        const response = await apiClient.post(
            `/adaptive-recommendations/${userId}/update`,
            questionResult
        );
        return response.data;
    } catch {
        return null;
    }
};

export default getDailyRecommendations;
