/**
 * Telegram WebApp Initialization Hook
 * 
 * Хук для инициализации Telegram WebApp SDK и автоматической аутентификации.
 * Обрабатывает все аспекты интеграции с Telegram Mini App.
 * 
 * @version 2.1.5
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { initTelegramWebApp } from '../services/api';

interface TelegramInitResult {
  initialized: boolean;
  error: string | null;
  telegramSdk: any;
}

export function useTelegramInit(): TelegramInitResult {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [telegramSdk, setTelegramSdk] = useState<any>(null);
  const { login } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      try {
        // Инициализируем Telegram WebApp
        const tg = initTelegramWebApp();
        
        if (!tg) {
          setError('Telegram WebApp SDK не загружен');
          return;
        }

        setTelegramSdk(tg);

        // Настраиваем тему и внешний вид
        tg.ready();
        tg.expand();
        
        // Устанавливаем цвет темы если доступно
        if (tg.setHeaderColor) {
          tg.setHeaderColor('#0B0B0C');
        }
        if (tg.setBackgroundColor) {
          tg.setBackgroundColor('#0B0B0C');
        }

        // Ждём немного чтобы WebApp инициализировался
        await new Promise(resolve => setTimeout(resolve, 500));

        // Автоматический вход через Telegram
        const loginResult = await login();
        
        if (!loginResult) {
          setError('Не удалось выполнить вход');
          return;
        }

        setInitialized(true);
      } catch (err) {
        console.error('Telegram initialization error:', err);
        setError(err instanceof Error ? err.message : 'Ошибка инициализации');
      }
    };

    init();
  }, [login]);

  return {
    initialized,
    error,
    telegramSdk
  };
}
