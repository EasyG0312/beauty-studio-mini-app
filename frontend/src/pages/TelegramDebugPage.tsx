import { useEffect, useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';

export default function TelegramDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [apiTest, setApiTest] = useState<string>('Не проверено');

  useEffect(() => {
    const win = window as any;
    const tg = win.Telegram?.WebApp;

    const info = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      hasTelegram: !!win.Telegram,
      hasWebApp: !!tg,
      initData: tg?.initData || null,
      initDataLength: tg?.initData?.length || 0,
      initDataUnsafe: tg?.initDataUnsafe || null,
      version: tg?.version || null,
      platform: tg?.platform || null,
      colorScheme: tg?.colorScheme || null,
      themeParams: tg?.themeParams || null,
      isExpanded: tg?.isExpanded || null,
      viewportHeight: tg?.viewportHeight || null,
      viewportStableHeight: tg?.viewportStableHeight || null,
      searchParams: Object.fromEntries(new URLSearchParams(window.location.search)),
    };

    setDebugInfo(info);
    console.log('=== Telegram Debug Info ===', info);
  }, []);

  const testApiConnection = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://beauty-studio-api.onrender.com/api';
    try {
      setApiTest('Проверка...');
      const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/health`);
      const data = await response.json();
      setApiTest(`✅ API работает: ${JSON.stringify(data)}`);
    } catch (error: any) {
      setApiTest(`❌ Ошибка API: ${error.message}`);
    }
  };

  if (!debugInfo) {
    return <div className="page"><div className="loading">Загрузка...</div></div>;
  }

  return (
    <div className="page">
      <h1 style={{ fontFamily: 'var(--font-serif)', marginBottom: 16 }}>
        🔍 Диагностика Telegram WebApp
      </h1>

      <Card elevated style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Статус Telegram</h3>
        <div style={{ 
          padding: 12, 
          borderRadius: 8, 
          background: debugInfo.hasWebApp ? 'rgba(0,200,0,0.1)' : 'rgba(200,0,0,0.1)',
          marginBottom: 12
        }}>
          <strong>
            {debugInfo.hasWebApp ? '✅ Telegram WebApp обнаружен' : '❌ Telegram WebApp НЕ обнаружен'}
          </strong>
        </div>
        
        {debugInfo.hasWebApp ? (
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            <p><strong>Версия:</strong> {debugInfo.version || 'N/A'}</p>
            <p><strong>Платформа:</strong> {debugInfo.platform || 'N/A'}</p>
            <p><strong>Тема:</strong> {debugInfo.colorScheme || 'N/A'}</p>
            <p><strong>initData:</strong> {debugInfo.initData ? `✅ Да (${debugInfo.initDataLength} символов)` : '❌ Нет'}</p>
            <p><strong>initDataUnsafe.user:</strong> {debugInfo.initDataUnsafe?.user ? '✅ Да' : '❌ Нет'}</p>
          </div>
        ) : (
          <p style={{ color: 'var(--error-color)' }}>
            Приложение открыто не через Telegram. Для теста используйте кнопку в боте.
          </p>
        )}
      </Card>

      <Card elevated style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Параметры URL</h3>
        <pre style={{ 
          fontSize: 12, 
          background: 'rgba(0,0,0,0.3)', 
          padding: 12, 
          borderRadius: 8,
          overflow: 'auto'
        }}>
          {JSON.stringify(debugInfo.searchParams, null, 2)}
        </pre>
      </Card>

      <Card elevated style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Проверка API</h3>
        <p style={{ marginBottom: 12, fontSize: 14 }}>
          <strong>Статус:</strong> {apiTest}
        </p>
        <Button onClick={testApiConnection} variant="secondary">
          Проверить подключение к API
        </Button>
      </Card>

      <Card elevated>
        <h3 style={{ marginBottom: 12 }}>Полные данные</h3>
        <pre style={{ 
          fontSize: 10, 
          background: 'rgba(0,0,0,0.3)', 
          padding: 12, 
          borderRadius: 8,
          overflow: 'auto',
          maxHeight: '300px'
        }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </Card>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Button onClick={() => window.location.reload()}>
          🔄 Перезагрузить страницу
        </Button>
      </div>
    </div>
  );
}
