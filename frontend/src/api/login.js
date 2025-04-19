import axios from 'axios';

export function login({
  email, password,
}) {
  console.log('login API: ', {
    email,
    password,
  });
  return axios.post(
    `${process.env.REACT_APP_API_BASE_URI}/authentication/signin`,
    {
      email,
      password,
    }
  );
}

export const googleLogin = async (googleUserData) => {
  try {
    console.log('Sending Google login request with data:', googleUserData);
    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URI}/authentication/google`,
      { token: googleUserData.token },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('Google login response:', response);
    return response;
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
};

export const getUserInfo = async (userId) => {
  try {
    console.log('Fetching user info for userId:', userId);
    console.log('API URL:', `${process.env.REACT_APP_API_BASE_URI}/authentication/user/${userId}`);
    console.log('Environment variables:', {
      REACT_APP_API_BASE_URI: process.env.REACT_APP_API_BASE_URI,
      NODE_ENV: process.env.NODE_ENV
    });

    const response = await axios.get(
      `${process.env.REACT_APP_API_BASE_URI}/authentication/user/${userId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('User info response:', response);
    return response;
  } catch (error) {
    console.error('Error fetching user info:', error);
    console.error('Error details:', error.message, error.response?.data);
    throw error;
  }
};
