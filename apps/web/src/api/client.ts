import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url ?? '';

    // Don't retry refresh or login calls
    if (status === 401 && !isRefreshing && !url.includes('/auth/refresh') && !url.includes('/auth/login')) {
      isRefreshing = true;
      try {
        await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
        isRefreshing = false;
        return apiClient.request(error.config);
      } catch {
        isRefreshing = false;
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);
