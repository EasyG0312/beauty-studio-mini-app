import { create } from 'zustand';
import type { AuthState, UserRole } from '../types';
import { authTelegram, getTelegramUser, getTelegramInitData, parseTelegramInitData } from '../services/api';

interface AuthStore extends AuthState {
  login: () => Promise<void>;
  logout: () => void;
  setRole: (role: UserRole) => void;
  loginAsAdmin: () => void; // Демо-вход для тестирования
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

      console.log('Attempting Telegram auth for user:', authData.id);

      const response = await authTelegram(authData);

      console.log('Auth response:', { role: response.role, userId: response.user_id });

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

  // Демо-вход как админ (для тестирования)
  loginAsAdmin: () => {
    const adminToken = 'demo-admin-token-' + Date.now();
    localStorage.setItem('auth_token', adminToken);
    
    set({
      isAuthenticated: true,
      user: {
        id: 338067005, // Ваш chat_id
        role: 'owner', // Владелец
        telegramUser: {
          id: 338067005,
          first_name: 'Demo',
          last_name: 'Admin',
          username: 'demo_admin',
        },
      },
      token: adminToken,
    });
    
    console.log('Logged in as demo admin (owner)');
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
