import axios from 'axios';

export function login(payload) {
  return axios.post(`${process.env.REACT_APP_API_BASE_URI}/authentication/login`, payload);
}

export const googleLogin = async (accessToken) => {
  try {
    // Fetch user data from Google API using the access token
    const googleUserResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
    const googleUserData = await googleUserResponse.json();

    // Send user data to our backend
    const response = await axios.post(`${process.env.REACT_APP_API_BASE_URI}/authentication/google-login`, {
      googleId: googleUserData.id,
      email: googleUserData.email,
      firstName: googleUserData.given_name,
      lastName: googleUserData.family_name,
      picture: googleUserData.picture
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
