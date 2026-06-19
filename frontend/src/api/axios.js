import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api',
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config;
    // Retry once on timeout (Render cold start)
    if (err.code === 'ECONNABORTED' && !config._retry) {
      config._retry = true;
      return api(config);
    }
    if (err.response?.status === 401) {
      const url = config?.url || '';
      if (url.includes('/customer/me') || url.includes('/auth/firebase-token') || url.includes('/auth/me')) {
        return Promise.reject(err);
      }
      const user = useAuthStore.getState().user;
      useAuthStore.getState().logout();
      if (user?.role === 'customer') {
        window.location.href = '/customer/login';
      } else {
        window.location.href = '/';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
