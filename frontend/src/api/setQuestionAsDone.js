import apiClient from './client.js';

export function setQuestionAsDone({
  userId, questionId,
}) {
  return apiClient.post('/solveHistory', {
    questionId,
    userId,
  });
}
