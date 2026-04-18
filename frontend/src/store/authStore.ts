import { create } from 'zustand';
import type { AuthState, UserRole } from '../types';
import { authTelegram, getTelegramUser, getTelegramInitData, parseTelegramInitData } from '../services/api';

interface AuthStore extends AuthState {
  login: () => Promise<{ success: boolean; error?: string }>;
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
      
      const initDataResult = await getTelegramInitData();
      if (!initDataResult) {
        console.warn('Telegram initData not available - not running inside Telegram WebApp');
        return { success: false, error: 'Telegram initData не найдены. Откройте приложение через кнопку бота в Telegram.' };
      }

      console.log('Init data received, length:', initDataResult.initData.length, 'source:', initDataResult.source);

      const authData = parseTelegramInitData(initDataResult.initData, initDataResult.source !== 'initData');
      if (!authData) {
        console.error('Failed to parse Telegram initData', initDataResult);
        return { success: false, error: 'Не удалось распознать данные Telegram. Попробуйте открыть приложение снова.' };
      }

      console.log('Auth data parsed:', { id: authData.id, first_name: authData.first_name });

      // Добавляем оригинальную строку initData
      const authDataWithInit = {
        ...authData,
        telegram_init_data: initDataResult.initData,
        telegram_init_data_source: initDataResult.source,
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

      return { success: true };
    } catch (error: any) {
      console.error('Login failed:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || 'Ошибка входа через Telegram';
      return { success: false, error: errorMessage };
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
