import apiClient from './client.js';

export const getQuestions = async () => {
  const response = await apiClient.get('/questions');
  if (!response?.data?.success || !Array.isArray(response.data.data)) {
    throw new Error('Invalid API response structure');
  }
  return response.data;
};
