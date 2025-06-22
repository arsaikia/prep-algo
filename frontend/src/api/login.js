import axios from 'axios';

export function login(payload) {
  return axios.post(`${process.env.REACT_APP_API_BASE_URI}/authentication/login`, payload);
}

export const googleLogin = async (token) => {
  try {
    // Send user data to our backend
    const response = await axios.post(`${process.env.REACT_APP_API_BASE_URI}/authentication/google`, {
      token,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

export const getUserInfo = async (userId) => {
  try {
    const response = await axios.get(`${process.env.REACT_APP_API_BASE_URI}/authentication/user/${userId}`);

    return response;
  } catch (error) {
    throw error;
  }
};
