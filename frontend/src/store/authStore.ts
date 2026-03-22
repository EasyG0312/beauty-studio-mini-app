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
        throw new Error('Telegram initData not available');
      }
      
      const authData = parseTelegramInitData(initData);
      if (!authData) {
        throw new Error('Failed to parse Telegram initData');
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
      throw error;
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
