import axios from 'axios';

const API_BASE_URI = process.env.REACT_APP_API_BASE_URI;

export const getQuestions = async () => {
  try {
    const response = await axios.get(`${API_BASE_URI}/questions`);


    if (!response?.data?.success || !Array.isArray(response.data.data)) {
      throw new Error('Invalid API response structure');
    }

    return response.data;
  } catch (error) {

    throw error;
  }
};
