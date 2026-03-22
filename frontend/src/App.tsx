import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { initTelegramWebApp } from './services/api';

// Pages
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import MyBookingsPage from './pages/MyBookingsPage';
import ServicesPage from './pages/ServicesPage';
import ManagerDashboardPage from './pages/ManagerDashboardPage';
import AnalyticsDashboardPage from './pages/AnalyticsDashboardPage';
import ReviewsPage from './pages/ReviewsPage';
import PortfolioPage from './pages/PortfolioPage';
import FAQPage from './pages/FAQPage';
import WaitlistPage from './pages/WaitlistPage';
import ChatPage from './pages/ChatPage';
import LoyaltyPage from './pages/LoyaltyPage';
import NotificationsPage from './pages/NotificationsPage';
import MasterSchedulePage from './pages/MasterSchedulePage';
import NotFoundPage from './pages/NotFoundPage';

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

        {/* Показываем навигацию только клиентам */}
        {user?.role === 'client' && <Navigation />}
      </div>
    </BrowserRouter>
  );
}

export default App;
