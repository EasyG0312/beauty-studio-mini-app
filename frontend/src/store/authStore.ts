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
      console.log('Starting Telegram auth...');
      
      const initData = getTelegramInitData();
      if (!initData) {
        console.warn('Telegram initData not available - not running inside Telegram WebApp');
        return;
      }

      console.log('Init data received, length:', initData.length);

      const authData = parseTelegramInitData(initData);
      if (!authData) {
        console.error('Failed to parse Telegram initData');
        return;
      }

      console.log('Auth data parsed:', { id: authData.id, first_name: authData.first_name });

      // Добавляем оригинальную строку initData
      const authDataWithInit = {
        ...authData,
        telegram_init_data: initData,
      };

      const response = await authTelegram(authDataWithInit);

      console.log('Auth successful:', { role: response.role, userId: response.user_id });

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
    } catch (error: any) {
      console.error('Login failed:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
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
