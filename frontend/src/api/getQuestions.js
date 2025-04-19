import axios from 'axios';

const API_BASE_URI = process.env.REACT_APP_API_BASE_URI;

export const getQuestions = async () => {
  try {
    const response = await axios.get(`${API_BASE_URI}/questions`);
    console.log('Questions API Response:', {
      success: response.data.success,
      count: response.data.count,
      dataLength: response.data.data?.length,
      sampleData: response.data.data?.slice(0, 2)
    });

    if (!response?.data?.success || !Array.isArray(response.data.data)) {
      throw new Error('Invalid API response structure');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
};
