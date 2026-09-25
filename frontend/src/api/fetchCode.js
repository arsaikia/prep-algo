import apiClient from './client.js';

export function fetchCode({
  login, url, codeOnly = false,
}) {
  return apiClient.post('/code', {
    login,
    url,
    codeOnly,
  }).then((res) => {
    if (res.data.success) {
      return res.data.data;
    }
    throw new Error('Failed to fetch code');
  }).catch((error) => {
    throw new Error(`Error: ${error.message}`);
  });
}
