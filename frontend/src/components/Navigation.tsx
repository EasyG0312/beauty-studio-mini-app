import { NavLink } from 'react-router-dom';
import { haptic } from '../services/haptic';
import { IconHome, IconCalendar, IconClipboard, IconGrid, IconStar, IconImage, IconHelp } from './Icons';

export default function Navigation() {
  const navItems = [
    { to: '/', icon: IconHome, label: 'Главная' },
    { to: '/booking', icon: IconCalendar, label: 'Записаться' },
    { to: '/my-bookings', icon: IconClipboard, label: 'Записи' },
    { to: '/services', icon: IconGrid, label: 'Услуги' },
    { to: '/reviews', icon: IconStar, label: 'Отзывы' },
    { to: '/portfolio', icon: IconImage, label: 'Работы' },
    { to: '/faq', icon: IconHelp, label: 'FAQ' },
  ];

  return (
    <nav className="nav-bar">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          onClick={() => haptic.selection()}
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
