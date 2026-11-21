import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Attach the in-memory access token (never persisted to storage).
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Shared in-flight refresh so concurrent 401s trigger only one refresh call.
let refreshPromise: Promise<string> | null = null;

// Uses raw axios (not `api`) so the refresh request never re-enters this interceptor.
export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await axios.post<{ success: true; data: { accessToken: string } }>(
        `${BASE_URL}/auth/refresh`,
        undefined,
        { withCredentials: true },
      );
      const token = res.data.data.accessToken;
      useAuthStore.getState().setAccessToken(token);
      return token;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

const SKIP_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = original?.url ?? '';

    if (
      status !== 401 ||
      !original ||
      original._retry === true ||
      SKIP_REFRESH_PATHS.some((p) => url.includes(p))
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      await refreshAccessToken();
    } catch {
      useAuthStore.getState().clearAuth();
      return Promise.reject(error);
    }

    // Retry once; the request interceptor attaches the new token.
    return api(original);
  },
);

export default api;
