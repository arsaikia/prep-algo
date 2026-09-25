import axios from 'axios';

export function setQuestionAsDone({
  userId, questionId,
}) {
  return axios.post(`${import.meta.env.VITE_API_BASE_URI}/solveHistory`, {
    questionId,
    userId,
  });
}
