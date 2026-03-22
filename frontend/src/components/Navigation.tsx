import { NavLink } from 'react-router-dom';

export default function Navigation() {
  return (
    <nav className="nav-bar">
      <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">🏠</span>
        <span>Главная</span>
      </NavLink>
      <NavLink to="/booking" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">📅</span>
        <span>Записаться</span>
      </NavLink>
      <NavLink to="/my-bookings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">📋</span>
        <span>Записи</span>
      </NavLink>
      <NavLink to="/services" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">💇</span>
        <span>Услуги</span>
      </NavLink>
      <NavLink to="/reviews" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">⭐</span>
        <span>Отзывы</span>
      </NavLink>
      <NavLink to="/portfolio" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">📸</span>
        <span>Работы</span>
      </NavLink>
      <NavLink to="/faq" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">❓</span>
        <span>FAQ</span>
      </NavLink>
    </nav>
  );
}
