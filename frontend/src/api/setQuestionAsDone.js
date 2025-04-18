import axios from 'axios';

export function setQuestionAsDone({
  userId, questionId,
}) {
  return axios.post(`${process.env.REACT_APP_API_BASE_URI}/solveHistory`, {
    questionId,
    userId,
  });
}
