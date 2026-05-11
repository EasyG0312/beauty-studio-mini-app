import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAuthStore } from './store/authStore';
import { useTelegramInit } from './hooks/useTelegramInit';

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
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const PortfolioUploadPage = lazy(() => import('./pages/PortfolioUploadPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const WaitlistPage = lazy(() => import('./pages/WaitlistPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const LoyaltyPage = lazy(() => import('./pages/LoyaltyPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const CreateReviewPage = lazy(() => import('./pages/CreateReviewPage'));
const VisitsPage = lazy(() => import('./pages/VisitsPage'));
const MasterSchedulePage = lazy(() => import('./pages/MasterSchedulePage'));
const MasterManagementPage = lazy(() => import('./pages/MasterManagementPage'));
const FinancialDashboardPage = lazy(() => import('./pages/FinancialDashboardPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const PayrollPage = lazy(() => import('./pages/PayrollPage'));
const ActivityLogPage = lazy(() => import('./pages/ActivityLogPage'));
const ServicesManagementPage = lazy(() => import('./pages/ServicesManagementPage'));
const ClientManagementPage = lazy(() => import('./pages/ClientManagementPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const ReviewsManagementPage = lazy(() => import('./pages/ReviewsManagementPage'));
const ReminderSettingsPage = lazy(() => import('./pages/ReminderSettingsPage'));
const InactiveClientsPage = lazy(() => import('./pages/InactiveClientsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AuthTestPage = lazy(() => import('./pages/AuthTestPage'));
const RemindersPage = lazy(() => import('./pages/RemindersPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Components
import Navigation from './components/Navigation';
import AdminNavigation from './components/AdminNavigation';
import Loading from './components/Loading';

function App() {
  const { user } = useAuthStore();
  const { initialized, error } = useTelegramInit();

  if (!initialized) {
    if (error) {
      return (
        <div className="app" style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Ошибка инициализации</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            🔄 Перезагрузить
          </button>
        </div>
      );
    }
    return <Loading />;
  }


  return (
    <BrowserRouter>
      <div className="app">
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
            <Route path="/reviews-management" element={<ReviewsManagementPage />} />
            <Route path="/reminder-settings" element={<ReminderSettingsPage />} />
            <Route path="/inactive-clients" element={<InactiveClientsPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/portfolio/upload" element={<PortfolioUploadPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/waitlist" element={<WaitlistPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/loyalty" element={<LoyaltyPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/create-review" element={<CreateReviewPage />} />
            <Route path="/visits" element={<VisitsPage />} />
            <Route path="/auth-test" element={<AuthTestPage />} />
            <Route
              path="/master-schedule"
              element={
                user?.role === 'manager' || user?.role === 'owner'
                  ? <MasterSchedulePage />
                  : <Navigate to="/" />
              }
            />
            <Route
              path="/master-management"
              element={
                user?.role === 'owner'
                  ? <MasterManagementPage />
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

            {/* Financial routes (Owner only) */}
            <Route
              path="/financial-dashboard"
              element={
                user?.role === 'owner'
                  ? <FinancialDashboardPage />
                  : <Navigate to="/" />
              }
            />
            <Route
              path="/expenses"
              element={
                user?.role === 'owner'
                  ? <ExpensesPage />
                  : <Navigate to="/" />
              }
            />
            <Route
              path="/payroll"
              element={
                user?.role === 'owner'
                  ? <PayrollPage />
                  : <Navigate to="/" />
              }
            />
            <Route
              path="/activity-log"
              element={
                user?.role === 'owner' || user?.role === 'manager'
                  ? <ActivityLogPage />
                  : <Navigate to="/" />
              }
            />
            <Route
              path="/services"
              element={
                user?.role === 'owner' || user?.role === 'manager'
                  ? <ServicesManagementPage />
                  : <Navigate to="/" />
              }
            />
            <Route
              path="/clients"
              element={
                user?.role === 'owner' || user?.role === 'manager'
                  ? <ClientManagementPage />
                  : <Navigate to="/" />
              }
            />
            <Route
              path="/inventory"
              element={
                user?.role === 'owner' || user?.role === 'manager'
                  ? <InventoryPage />
                  : <Navigate to="/" />
              }
            />
            <Route
              path="/reviews"
              element={
                user?.role === 'owner' || user?.role === 'manager'
                  ? <ReviewsManagementPage />
                  : <Navigate to="/" />
              }
            />

            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>

        {/* Показываем навигацию только клиентам */}
        {user?.role === 'client' && <Navigation />}

        {/* Показываем админскую навигацию для менеджеров/владельцев */}
        {(user?.role === 'manager' || user?.role === 'owner') && (
          <AdminNavigation userRole={user.role as 'manager' | 'owner'} />
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;
