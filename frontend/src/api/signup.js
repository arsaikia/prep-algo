import apiClient from './client.js';

export function signup(payload) {
  return apiClient.post('/authentication/signup', payload);
}
