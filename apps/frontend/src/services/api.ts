import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // pour le cookie refreshToken
});

// Injecte l'access token dans chaque requête
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Refresh automatique sur 401
let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    try {
      if (!refreshing) {
        refreshing = api
          .post<{ data: { accessToken: string } }>('/auth/refresh')
          .then((r) => r.data.data.accessToken)
          .finally(() => {
            refreshing = null;
          });
      }
      const newToken = await refreshing;
      const { user } = useAuthStore.getState();
      if (user) useAuthStore.getState().setAuth(newToken, user);
      original.headers['Authorization'] = `Bearer ${newToken}`;
      return api(original);
    } catch {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      return Promise.reject(error);
    }
  },
);
