import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, Suspense, lazy } from 'react';
import { useAuthStore } from './store/authStore';
import { initTelegramWebApp } from './services/api';

// Pages - Lazy loaded
const HomePage = lazy(() => import('./pages/HomePage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const ManagerDashboardPage = lazy(() => import('./pages/ManagerDashboardPage'));
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
    // Инициализируем Telegram WebApp
    initTelegramWebApp();

    // Автоматический вход через Telegram
    login().finally(() => {
      setInitialized(true);
    });
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
                  ? <AnalyticsDashboardPage />
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
      </div>
    </BrowserRouter>
  );
}

export default App;
