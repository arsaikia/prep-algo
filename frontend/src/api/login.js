import apiClient from './client.js';

export const googleLogin = async (token) => {
  const response = await apiClient.post('/authentication/google', { token });
  return response;
};

export const getUserInfo = async (userId) => {
  const response = await apiClient.get(`/authentication/user/${userId}`);
  return response;
};
