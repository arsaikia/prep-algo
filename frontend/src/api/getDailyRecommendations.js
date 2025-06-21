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

export default getDailyRecommendations; 