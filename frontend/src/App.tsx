import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useEffect, useState, Suspense, lazy } from 'react';
import { useAuthStore } from './store/authStore';
import { initTelegramWebApp } from './services/api';

// Pages - Lazy loaded
const HomePage = lazy(() => import('./pages/HomePage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
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
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Components
import Navigation from './components/Navigation';
import Loading from './components/Loading';

function App() {
  const [initialized, setInitialized] = useState(false);
  const { user, login } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      // Инициализируем Telegram WebApp
      initTelegramWebApp();

      // Ждём немного чтобы WebApp инициализировался
      await new Promise(resolve => setTimeout(resolve, 500));

      // Автоматический вход через Telegram
      await login();

      setInitialized(true);
    };

    init();
  }, []);

  if (!initialized) {
    return <Loading />;
  }

  return (
    <BrowserRouter>
      <div className="app">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/my-bookings" element={<MyBookingsPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/waitlist" element={<WaitlistPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/loyalty" element={<LoyaltyPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
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
      </div>
    </BrowserRouter>
  );
}

export default App;
