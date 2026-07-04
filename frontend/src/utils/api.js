import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Intercept requests to add Bearer token from localStorage as fallback
api.interceptors.request.use(config => {
  const token = localStorage.getItem('integra_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401 responses to clear token
api.interceptors.response.use(
  response => response,
  error => {
    if (error?.response?.status === 401 && !error.config.url?.includes('/auth/login')) {
      // Don't clear on login attempts
      const isAuthCheck = error.config.url?.includes('/auth/me');
      if (!isAuthCheck) {
        localStorage.removeItem('integra_token');
      }
    }
    return Promise.reject(error);
  }
);

export function formatApiError(error) {
  const detail = error?.response?.data?.detail;
  if (detail == null) return 'Algo deu errado. Tente novamente.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join(' ');
  if (detail?.msg) return detail.msg;
  return String(detail);
}

export default api;
