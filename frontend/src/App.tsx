import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useEffect, useState, Suspense, lazy } from 'react';
import { useAuthStore } from './store/authStore';
import { initTelegramWebApp, verifyQRCode, scanQRCode } from './services/api';

// Pages - Lazy loaded
const HomePage = lazy(() => import('./pages/HomePage'));
const BookingStartPage = lazy(() => import('./pages/BookingStartPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const MasterSelectPage = lazy(() => import('./pages/MasterSelectPage'));
const DateTimeSelectPage = lazy(() => import('./pages/DateTimeSelectPage'));
const ServiceSelectPage = lazy(() => import('./pages/ServiceSelectPage'));
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const ManagerDashboardPage = lazy(() => import('./pages/ManagerDashboardPage'));
const OwnerAnalyticsPage = lazy(() => import('./pages/OwnerAnalyticsPage'));
const AnalyticsDashboardPage = lazy(() => import('./pages/AnalyticsDashboardPage'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const WaitlistPage = lazy(() => import('./pages/WaitlistPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const LoyaltyPage = lazy(() => import('./pages/LoyaltyPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const MasterSchedulePage = lazy(() => import('./pages/MasterSchedulePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AuthTestPage = lazy(() => import('./pages/AuthTestPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const TelegramDebugPage = lazy(() => import('./pages/TelegramDebugPage'));

// Components
import Navigation from './components/Navigation';
import Loading from './components/Loading';

function App() {
  const [initialized, setInitialized] = useState(false);
  const { user, login } = useAuthStore();
  const [showDebug, setShowDebug] = useState(false);
  const [scannerResult, setScannerResult] = useState<any>(null);
  const [scannerError, setScannerError] = useState('');

  useEffect(() => {
    const init = async () => {
      console.log('=== APP INIT START === v2.1.1');
      
      // Инициализируем Telegram WebApp
      const tg = initTelegramWebApp();
      console.log('Telegram SDK:', tg ? 'loaded' : 'NOT loaded');
      console.log('Window.Telegram:', (window as any).Telegram ? 'YES' : 'NO');
      console.log('initData:', (window as any).Telegram?.WebApp?.initData ? 'YES (' + (window as any).Telegram.WebApp.initData.substring(0, 50) + '...)' : 'NO');
      console.log('initDataUnsafe:', JSON.stringify((window as any).Telegram?.WebApp?.initDataUnsafe?.user)?.substring(0, 100) || 'NO');

      // Ждём немного чтобы WebApp инициализировался
      await new Promise(resolve => setTimeout(resolve, 500));

      // Автоматический вход через Telegram
      console.log('Calling login()...');
      const loginResult = await login();
      console.log('login() completed', { loginResult });

      setInitialized(true);
      console.log('=== APP INIT DONE === v2.1.1');
    };

    init();
  }, []);

  // Scanner functions
  const openScanner = () => {
    setScannerResult(null);
    setScannerError('');
    
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.showScanQrPopup) {
      tg.showScanQrPopup(
        { text: 'Наведите камеру на QR-код клиента' },
        async (qrCode: string) => {
          tg.closeScanQrPopup?.();
          
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
    }
  };

  const markClientArrived = async () => {
    if (!scannerResult) return;
    
    try {
      await scanQRCode(scannerResult.qr_code);
      alert('✅ Клиент успешно отмечен как пришедший!');
      setScannerResult(null);
      window.location.href = '/manager';
    } catch (err: any) {
      alert('❌ Ошибка: ' + (err.response?.data?.detail || 'Не удалось отметить приход'));
    }
  };

  const closeScannerModal = () => {
    setScannerResult(null);
    setScannerError('');
  };

  if (!initialized) {
    return <Loading />;
  }

  // Debug overlay
  const DebugOverlay = () => {
    if (!showDebug) return null;
    const win = window as any;
    const hasTelegram = !!(win.Telegram && win.Telegram.WebApp);
    const hasInitData = !!(win.Telegram?.WebApp?.initData);
    const hasInitDataUnsafe = !!(win.Telegram?.WebApp?.initDataUnsafe?.user);
    
    return (
      <div style={{
        position: 'fixed',
        top: 50,
        left: 8,
        right: 8,
        background: 'rgba(0,0,0,0.9)',
        color: '#0f0',
        padding: 14,
        borderRadius: 12,
        fontSize: 11,
        fontFamily: 'monospace',
        zIndex: 9999,
        lineHeight: 1.7,
        maxHeight: '80vh',
        overflowY: 'auto',
      }}>
        <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: 8, fontSize: 13 }}>🔧 DEBUG v2.1.1</div>
        
        <div style={{ color: '#ff0' }}>═══ Telegram SDK ═══</div>
        <div>window.Telegram: {hasTelegram ? '✅' : '❌'}</div>
        <div>window.Telegram.WebApp: {hasTelegram ? '✅' : '❌'}</div>
        <div>initData: {hasInitData ? '✅ YES' : '❌ NO'}</div>
        <div>initDataUnsafe.user: {hasInitDataUnsafe ? '✅ YES' : '❌ NO'}</div>
        {hasInitDataUnsafe && (
          <div style={{ color: '#aaa', wordBreak: 'break-all' }}>
            user: {JSON.stringify(win.Telegram.WebApp.initDataUnsafe.user)}
          </div>
        )}
        {hasInitData && (
          <div style={{ color: '#aaa', wordBreak: 'break-all' }}>
            initData: {win.Telegram.WebApp.initData.substring(0, 80)}...
          </div>
        )}
        
        <div style={{ color: '#ff0', marginTop: 8 }}>═══ Auth ═══</div>
        <div>chat_id: {user?.id || '❌ null'}</div>
        <div>role: {user?.role || '❌ null'}</div>
        <div>token: {localStorage.getItem('auth_token') ? '✅' : '❌ null'}</div>
        
        <div style={{ color: '#ff0', marginTop: 8 }}>═══ Role Check ═══</div>
        <div>ADMIN_IDS: 338067005</div>
        <div>OWNER_IDS: 338067005</div>
        <div>Match admin: {user?.id === 338067005 ? '✅ YES' : '❌ NO'}</div>
        <div>Match owner: {user?.id === 338067005 ? '✅ YES' : '❌ NO'}</div>
        
        <button 
          onClick={() => setShowDebug(false)}
          style={{ marginTop: 12, background: '#C9A96E', color: '#000', border: 'none', padding: '8px 20px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
        >
          Закрыть
        </button>
      </div>
    );
  };

  return (
    <BrowserRouter>
      <div className="app">
        <DebugOverlay />
        {/* Debug toggle button - visible to everyone */}
        <button
          onClick={() => setShowDebug(!showDebug)}
          style={{
            position: 'fixed',
            top: 12,
            right: 12,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8,
            width: 32,
            height: 32,
            fontSize: 14,
            cursor: 'pointer',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Debug info"
        >
          🔧
        </button>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/booking" element={<BookingStartPage />} />
            <Route path="/booking/form" element={<BookingPage />} />
            <Route path="/booking/master" element={<MasterSelectPage />} />
            <Route path="/booking/datetime" element={<DateTimeSelectPage />} />
            <Route path="/booking/service" element={<ServiceSelectPage />} />
            <Route path="/my-bookings" element={<MyBookingsPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/waitlist" element={<WaitlistPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/loyalty" element={<LoyaltyPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/auth-test" element={<AuthTestPage />} />
            <Route
              path="/master-schedule"
              element={
                user?.role === 'manager' || user?.role === 'owner'
                  ? <MasterSchedulePage />
                  : <Navigate to="/" />
              }
            />

            {/* Manager routes */}
            <Route
              path="/manager"
              element={
                user?.role === 'manager' || user?.role === 'owner'
                  ? <ManagerDashboardPage />
                  : <Navigate to="/" />
              }
            />

            {/* Owner routes */}
            <Route
              path="/owner"
              element={
                user?.role === 'owner'
                  ? <OwnerAnalyticsPage />
                  : <Navigate to="/" />
              }
            />
            <Route
              path="/analytics"
              element={
                user?.role === 'owner' || user?.role === 'manager'
                  ? <AnalyticsDashboardPage />
                  : <Navigate to="/" />
              }
            />

            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/telegram-debug" element={<TelegramDebugPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>

        {/* Показываем навигацию только клиентам */}
        {user?.role === 'client' && <Navigation />}

        {/* Показываем админскую навигацию для менеджеров/владельцев */}
        {(user?.role === 'manager' || user?.role === 'owner') && (
          <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'var(--tg-theme-bg-color)',
            borderTop: '1px solid var(--tg-theme-secondary-bg-color)',
            display: 'flex',
            justifyContent: 'space-around',
            padding: '8px 0',
            zIndex: 100,
          }}>
            <NavLink
              to="/manager"
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
              style={{ flex: 1, textAlign: 'center' }}
            >
              <span className="nav-icon">📊</span>
              <span>Панель</span>
            </NavLink>
            <NavLink
              to="/analytics"
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
              style={{ flex: 1, textAlign: 'center' }}
            >
              <span className="nav-icon">📈</span>
              <span>Аналитика</span>
            </NavLink>
            <button
              onClick={openScanner}
              className="nav-item"
              style={{ flex: 1, textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <span className="nav-icon">📱</span>
              <span>Сканер</span>
            </button>
            {user?.role === 'owner' && (
              <NavLink
                to="/owner"
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
                style={{ flex: 1, textAlign: 'center' }}
              >
                <span className="nav-icon">👑</span>
                <span>Владелец</span>
              </NavLink>
            )}
          </nav>
        )}

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
      </div>
    </BrowserRouter>
  );
}

export default App;
