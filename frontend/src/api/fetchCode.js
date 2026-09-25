import axios from 'axios';

export function fetchCode({
  login, url, codeOnly = false,
}) {
  return axios.post(`${import.meta.env.VITE_API_BASE_URI}/code`, {
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
