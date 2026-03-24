import { create } from 'zustand';
import type { AuthState, UserRole } from '../types';
import { authTelegram, getTelegramUser, getTelegramInitData, parseTelegramInitData } from '../services/api';

interface AuthStore extends AuthState {
  login: () => Promise<void>;
  logout: () => void;
  setRole: (role: UserRole) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  user: null,
  token: localStorage.getItem('auth_token'),
  
  login: async () => {
    try {
      const initData = getTelegramInitData();
      if (!initData) {
        // Not running inside Telegram WebApp (or initData not available).
        // Skip Telegram auth here — app may work in demo mode or rely on backend session.
        console.warn('Telegram initData not available; skipping Telegram auth.');
        return;
      }

      const authData = parseTelegramInitData(initData);
      if (!authData) {
        console.warn('Failed to parse Telegram initData; skipping auth.');
        return;
      }

      const response = await authTelegram(authData);

      localStorage.setItem('auth_token', response.access_token);

      set({
        isAuthenticated: true,
        user: {
          id: response.user_id,
          role: response.role,
          telegramUser: getTelegramUser() || undefined,
        },
        token: response.access_token,
      });
    } catch (error) {
      console.error('Login failed:', error);
      // don't rethrow — allow app to continue in non-telegram contexts
    }
  },
  
  logout: () => {
    localStorage.removeItem('auth_token');
    set({
      isAuthenticated: false,
      user: null,
      token: null,
    });
  },
  
  setRole: (role: UserRole) => {
    set((state) => ({
      user: state.user ? { ...state.user, role } : null,
    }));
  },
}));
