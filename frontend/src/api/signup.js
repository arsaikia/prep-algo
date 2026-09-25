import axios from 'axios';

export function signup(payload) {
  return axios.post(`${import.meta.env.VITE_API_BASE_URI}/authentication/signup`, payload);
}
