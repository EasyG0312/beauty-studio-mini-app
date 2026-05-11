/**
 * QR Scanner Component
 * 
 * Компонент для сканирования QR-кодов клиентов сотрудниками салона.
 * Интегрирован с Telegram WebApp SDK для нативного сканирования.
 * 
 * @version 2.1.5
 */

import { useState } from 'react';
import { verifyQRCode, scanQRCode } from '../services/api';

interface ScannerResult {
  success: boolean;
  booking_id: number;
  client_name: string;
  client_phone: string;
  service: string;
  master: string;
  date: string;
  time: string;
  status: string;
  is_arrived: boolean;
  message: string;
  qr_code?: string; // Добавляем опциональное свойство
}

interface QRScannerProps {
  onSuccess?: () => void;
}

export default function QRScanner({ onSuccess }: QRScannerProps) {
  const [scannerResult, setScannerResult] = useState<ScannerResult | null>(null);
  const [scannerError, setScannerError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const openScanner = () => {
    setScannerResult(null);
    setScannerError('');
    setIsScanning(true);
    
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.showScanQrPopup) {
      tg.showScanQrPopup(
        { text: 'Наведите камеру на QR-код клиента' },
        async (qrCode: string) => {
          tg.closeScanQrPopup?.();
          setIsScanning(false);
          
          try {
            const data = await verifyQRCode(qrCode);
            setScannerResult(data);
          } catch (err: any) {
            setScannerError(err.response?.data?.detail || 'Неверный QR-код');
          }
        }
      );
    } else {
      setScannerError('Сканер недоступен в этом браузере');
      setIsScanning(false);
    }
  };

  const markClientArrived = async () => {
    if (!scannerResult) return;
    
    try {
      await scanQRCode(scannerResult.qr_code as any);
      alert('✅ Клиент успешно отмечен как пришедший!');
      setScannerResult(null);
      onSuccess?.();
    } catch (err: any) {
      alert('❌ Ошибка: ' + (err.response?.data?.detail || 'Не удалось отметить приход'));
    }
  };

  const closeScannerModal = () => {
    setScannerResult(null);
    setScannerError('');
  };

  return (
    <>
      {/* Scanner Button */}
      <button
        onClick={openScanner}
        className="nav-item"
        style={{ 
          flex: 1, 
          textAlign: 'center', 
          background: 'none', 
          border: 'none', 
          cursor: 'pointer' 
        }}
        disabled={isScanning}
      >
        <span className="nav-icon">📱</span>
        <span>{isScanning ? 'Сканирование...' : 'Сканер'}</span>
      </button>

      {/* Scanner Result Modal */}
      {scannerResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--tg-theme-bg-color, #fff)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '16px' }}>📝 Информация о записи</h3>
            
            <div style={{ marginBottom: '12px' }}>
              <strong>Клиент:</strong> {scannerResult.client_name}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Телефон:</strong> {scannerResult.client_phone}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Услуга:</strong> {scannerResult.service}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Мастер:</strong> {scannerResult.master}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Дата:</strong> {scannerResult.date}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Время:</strong> {scannerResult.time}
            </div>
            <div style={{ marginBottom: '20px' }}>
              <strong>Статус:</strong> {scannerResult.is_arrived ? '✅ Пришёл' : scannerResult.status}
            </div>

            {!scannerResult.is_arrived && scannerResult.status !== 'cancelled' && (
              <button
                onClick={markClientArrived}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'var(--tg-theme-button-color, #4CAF50)',
                  color: 'var(--tg-theme-button-text-color, #fff)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  marginBottom: '12px',
                  cursor: 'pointer'
                }}
              >
                ✅ Отметить как пришедшего
              </button>
            )}
            
            <button
              onClick={closeScannerModal}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--tg-theme-secondary-bg-color, #f0f0f0)',
                color: 'var(--tg-theme-text-color, #333)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              {scannerResult.is_arrived ? 'Закрыть' : 'Отмена'}
            </button>
          </div>
        </div>
      )}

      {/* Scanner Error */}
      {scannerError && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#ff4444',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: '8px',
          zIndex: 1001
        }}>
          {scannerError}
          <button
            onClick={() => setScannerError('')}
            style={{
              marginLeft: '12px',
              background: 'rgba(255,255,255,0.3)',
              border: 'none',
              color: '#fff',
              padding: '4px 12px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
