import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
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
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Проверка доступа только для manager/owner
  useEffect(() => {
    if (!user || (user.role !== 'manager' && user.role !== 'owner')) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, []);

  const startScanning = () => {
    setScanning(true);
    setError('');
    setResult(null);

    // Небольшая задержка для рендеринга DOM
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        false
      );

      scanner.render(
        async (decodedText) => {
          // Остановить сканер
          scanner.clear();
          setScanning(false);

          // Проверить код
          await handleCode(decodedText);
        },
        (errorMessage) => {
          // Игнорируем ошибки сканирования (нет QR кода в кадре)
          console.log('QR scan error:', errorMessage);
        }
      );

      scannerRef.current = scanner;
    }, 100);
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
  };

  return (
    <div className="page qr-scanner-page">
      <h1>📱 Сканер QR-кодов</h1>
      <p className="subtitle">Отметьте приход клиента по QR-коду</p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {!scanning && !result && (
        <div className="scanner-controls">
          <button className="btn btn-primary btn-lg" onClick={startScanning}>
            📷 Открыть камеру
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
          <div id="qr-reader" className="qr-reader"></div>
          <button className="btn btn-secondary" onClick={() => {
            if (scannerRef.current) {
              scannerRef.current.clear();
            }
            setScanning(false);
          }}>
            ❌ Закрыть камеру
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
