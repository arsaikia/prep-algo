import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URI,
  headers: { 'Content-Type': 'application/json' },
});

function getAuthToken() {
  const match = document.cookie.match(/(?:^|;\s*)authToken=([^;]*)/);
  try { return match ? decodeURIComponent(match[1]) : null; }
  catch { return null; }
}

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const token = getAuthToken();
    const requestToken = error.config?.headers?.Authorization || null;
    const sameSession = requestToken === (token ? `Bearer ${token}` : null);
    if (error.response?.status === 401 && sameSession && !error.config?.url?.endsWith('/authentication/google')) {
      document.cookie = 'authToken=; path=/; max-age=0';
      document.cookie = 'userId=; path=/; max-age=0';
      document.cookie = 'name=; path=/; max-age=0';
      window.dispatchEvent(new Event('prep:auth-expired'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
