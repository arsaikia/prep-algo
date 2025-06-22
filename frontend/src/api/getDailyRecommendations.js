import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URI || 'http://localhost:5000/api/v1';

export const getDailyRecommendations = async (userId, count = 5) => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/solveHistory/${userId}/daily-recommendations?count=${count}`
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching daily recommendations:', error);
        throw error;
    }
};

// NEW: Adaptive recommendations API
export const getAdaptiveDailyRecommendations = async (userId, count = 5) => {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/adaptive-recommendations/${userId}/daily?count=${count}`
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching adaptive recommendations:', error);
        // Fallback to original recommendations if adaptive fails
        console.warn('Falling back to original recommendations...');
        return getDailyRecommendations(userId, count);
    }
};

export const updateSolveHistory = async (userId, questionId) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/solveHistory`, {
            userId,
            questionId
        });
        return response.data;
    } catch (error) {
        console.error('Error updating solve history:', error);
        throw error;
    }
};

// NEW: Enhanced solve history update with adaptive context
export const updateSolveHistoryWithContext = async (sessionData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/solveHistory`, {
            userId: sessionData.userId,
            questionId: sessionData.questionId,
            timeSpent: sessionData.timeSpent,
            difficultyRating: sessionData.difficultyRating,
            tags: sessionData.tags,
            success: sessionData.success,
            strategy: sessionData.strategy,
            sessionNumber: sessionData.sessionNumber,
            previousQuestionResult: sessionData.previousQuestionResult
        });
        return response.data;
    } catch (error) {
        console.error('Error updating solve history with context:', error);
        throw error;
    }
};

// NEW: Update user adaptive profile
export const updateAdaptiveProfile = async (userId, questionResult) => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/adaptive-recommendations/${userId}/update`,
            questionResult
        );
        return response.data;
    } catch (error) {
        console.error('Error updating adaptive profile:', error);
        // Don't throw - this is optional enhancement
        return null;
    }
};

export default getDailyRecommendations; 