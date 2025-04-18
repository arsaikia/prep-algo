import axios from 'axios';

export function getQuestions(userId = 'guest') {
  return axios.get(`${process.env.REACT_APP_API_BASE_URI}/questions/${userId}`);
}
