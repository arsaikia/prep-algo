import axios from 'axios';

export function signup(payload) {
  return axios.post(`${process.env.REACT_APP_API_BASE_URI}/authentication/signup`, payload);
}
