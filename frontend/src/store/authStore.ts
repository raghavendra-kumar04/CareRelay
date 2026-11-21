import { create } from 'zustand';
import type { User, AuthPayload, ApiSuccess } from '../types';
import { api } from '../lib/api';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  register: (input: { name: string; email: string; password: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  getMe: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  isSubmitting: false,

  register: async (input) => {
    set({ isSubmitting: true });
    try {
      const response = await api.post<ApiSuccess<AuthPayload>>('/auth/register', input);
      const { user, accessToken } = response.data.data;
      set({ user, accessToken, isAuthenticated: true });
    } finally {
      set({ isSubmitting: false });
    }
  },

  login: async (input) => {
    set({ isSubmitting: true });
    try {
      const response = await api.post<ApiSuccess<AuthPayload>>('/auth/login', input);
      const { user, accessToken } = response.data.data;
      set({ user, accessToken, isAuthenticated: true });
    } finally {
      set({ isSubmitting: false });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore: logout is local-state cleanup regardless of server response
    }
    get().clearAuth();
  },

  getMe: async () => {
    const response = await api.get<ApiSuccess<{ user: User }>>('/auth/me');
    set({ user: response.data.data.user, isAuthenticated: true });
  },

  setAccessToken: (token) => {
    set({ accessToken: token, isAuthenticated: token !== null });
  },

  clearAuth: () => {
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  initializeAuth: async () => {
    try {
      const response = await api.post<ApiSuccess<{ accessToken: string }>>('/auth/refresh');
      set({ accessToken: response.data.data.accessToken });
      await get().getMe();
    } catch {
      get().clearAuth();
    } finally {
      set({ isLoading: false });
    }
  },
}));
