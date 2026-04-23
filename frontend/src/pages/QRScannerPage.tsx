import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyQRCode, scanQRCode } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { formatDate, formatTime } from '../utils/dateUtils';

interface ScanResult {
  valid: boolean;
  booking_id: number;
  client_name: string;
  client_phone: string;
  service: string;
  master: string;
  date: string;
  time: string;
  status: string;
  is_arrived: boolean;
}

export default function QRScannerPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [manualCode, setManualCode] = useState('');

  // Проверка доступа только для manager/owner
  useEffect(() => {
    if (!user || (user.role !== 'manager' && user.role !== 'owner')) {
      navigate('/');
    }
  }, [user, navigate]);

  // Автоматически запускаем сканер при открытии страницы
  useEffect(() => {
    // Небольшая задержка для полной загрузки страницы
    const timer = setTimeout(() => {
      startTelegramScanning();
    }, 500);

    return () => {
      clearTimeout(timer);
      // Закрыть сканер при уходе со страницы
      if (window.Telegram?.WebApp?.closeScanQrPopup) {
        window.Telegram.WebApp.closeScanQrPopup();
      }
    };
  }, []);

  const startTelegramScanning = () => {
    setScanning(true);
    setError('');

    const tg = window.Telegram?.WebApp;
    if (tg?.showScanQrPopup) {
      tg.showScanQrPopup(
        { text: 'Наведите камеру на QR-код клиента' },
        async (qrCode: string) => {
          // Закрыть попап сканера
          tg.closeScanQrPopup?.();
          setScanning(false);
          // Проверить код
          await handleCode(qrCode);
        }
      );
    } else {
      setError('Сканер QR-кодов недоступен в этом браузере. Используйте ручной ввод.');
      setScanning(false);
    }
  };

  const handleCode = async (code: string) => {
    try {
      setError('');
      const data = await verifyQRCode(code);
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Неверный QR-код');
      setResult(null);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await handleCode(manualCode.trim());
  };

  const markAsArrived = async () => {
    if (!result) return;

    try {
      // Используем booking_id для отметки прихода
      const response = await scanQRCode(result.booking_id.toString());
      setSuccess(response.message || 'Клиент успешно отмечен!');
      setResult({ ...result, status: 'arrived', is_arrived: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при отметке прихода');
    }
  };

  const resetScan = () => {
    setResult(null);
    setError('');
    setSuccess('');
    setManualCode('');
    // Автоматически запускаем сканер снова
    setTimeout(() => startTelegramScanning(), 300);
  };

  const closeScanner = () => {
    if (window.Telegram?.WebApp?.closeScanQrPopup) {
      window.Telegram.WebApp.closeScanQrPopup();
    }
    setScanning(false);
  };

  return (
    <div className="page qr-scanner-page">
      <h1>📱 Сканер QR-кодов</h1>
      <p className="subtitle">Отметьте приход клиента по QR-коду</p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {!scanning && !result && (
        <div className="scanner-controls">
          <p className="scanning-hint">Сканер автоматически откроется...</p>

          <button className="btn btn-primary btn-lg" onClick={startTelegramScanning}>
            📷 Открыть сканер снова
          </button>

          <div className="divider">или</div>

          <form onSubmit={handleManualSubmit} className="manual-code-form">
            <input
              type="text"
              placeholder="Введите код вручную"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="input"
            />
            <button type="submit" className="btn btn-secondary">
              Проверить
            </button>
          </form>
        </div>
      )}

      {scanning && (
        <div className="scanner-container">
          <div className="scanning-indicator">
            <div className="spinner"></div>
            <p>Сканирование... Наведите камеру на QR-код</p>
          </div>
          <button className="btn btn-secondary" onClick={closeScanner}>
            ❌ Закрыть сканер
          </button>
        </div>
      )}

      {result && (
        <div className="booking-card">
          <h3>📝 Информация о записи</h3>

          <div className="booking-details">
            <div className="detail-row">
              <span className="label">Клиент:</span>
              <span className="value">{result.client_name}</span>
            </div>
            <div className="detail-row">
              <span className="label">Телефон:</span>
              <span className="value">{result.client_phone}</span>
            </div>
            <div className="detail-row">
              <span className="label">Услуга:</span>
              <span className="value">{result.service}</span>
            </div>
            <div className="detail-row">
              <span className="label">Мастер:</span>
              <span className="value">{result.master}</span>
            </div>
            <div className="detail-row">
              <span className="label">Дата:</span>
              <span className="value">{formatDate(result.date)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Время:</span>
              <span className="value">{formatTime(result.time)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Статус:</span>
              <span className={`value status-${result.status}`}>
                {result.is_arrived ? '✅ Пришёл' : getStatusText(result.status)}
              </span>
            </div>
          </div>

          <div className="actions">
            {!result.is_arrived && result.status !== 'cancelled' && (
              <button className="btn btn-success btn-lg" onClick={markAsArrived}>
                ✅ Отметить как пришедшего
              </button>
            )}
            <button className="btn btn-secondary" onClick={resetScan}>
              🔄 Сканировать другой код
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusText(status: string): string {
  const statuses: Record<string, string> = {
    pending: '⏳ Ожидает',
    confirmed: '✅ Подтверждена',
    cancelled: '❌ Отменена',
    completed: '✔️ Выполнена',
    arrived: '🏃 Пришёл',
    no_show: '🚫 Не пришёл',
  };
  return statuses[status] || status;
}
