/**
 * Admin Navigation Component
 * 
 * Компонент навигации для менеджеров и владельцев салона.
 * Показывает административные функции в нижней панели навигации.
 * 
 * @version 2.1.5
 */

import { NavLink } from 'react-router-dom';
import QRScanner from './QRScanner';

interface AdminNavigationProps {
  userRole: 'manager' | 'owner';
}

export default function AdminNavigation({ userRole }: AdminNavigationProps) {
  const handleScannerSuccess = () => {
    // После успешного сканирования перенаправляем на панель менеджера
    window.location.href = '/manager';
  };

  return (
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
      {/* Панель менеджера */}
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

      {/* Аналитика */}
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

      {/* QR-сканер */}
      <QRScanner onSuccess={handleScannerSuccess} />

      {/* Панель владельца (только для владельцев) */}
      {userRole === 'owner' && (
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
  );
}
