import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Card from '../components/Card';
import Button from '../components/Button';
import {
  IconUser, IconCalendar,
  IconCrown, IconStar, IconChevronRight, IconSettings,
  IconList, IconMessage,
} from '../components/Icons';
import { getBookings } from '../services/api';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.telegramUser?.first_name || '');
  const [phone, setPhone] = useState('');
  const [visitCount, setVisitCount] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loyaltyProgress, setLoyaltyProgress] = useState(0);

  useEffect(() => {
    // Загрузка истории посещений
    if (user?.id) {
      getBookings({ chat_id: user.id, status_filter: 'completed' })
        .then(bookings => {
          setVisitCount(bookings.length);
          // Подсчёт потраченной суммы (из actual_amount)
          const spent = bookings.reduce((sum, b) => sum + (b.actual_amount || 0), 0);
          setTotalSpent(spent);
          setLoyaltyProgress(Math.min(bookings.length, 10));
        })
        .catch(() => {});
    }
  }, [user]);

  const handleSave = () => {
    setEditing(false);
    // TODO: Сохранить на сервере
  };

  const menuItems = [
    { icon: IconCalendar, label: 'Мои записи', action: () => navigate('/my-bookings') },
    { icon: IconList, label: 'История посещений', action: () => navigate('/my-bookings') },
    { icon: IconCrown, label: 'Программа лояльности', action: () => navigate('/loyalty') },
    { icon: IconMessage, label: 'Чат с менеджером', action: () => navigate('/chat') },
    { icon: IconStar, label: 'Мои отзывы', action: () => navigate('/reviews') },
    { icon: IconSettings, label: 'Настройки', action: () => {} },
  ];

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ 
          fontFamily: 'var(--font-serif)', 
          fontSize: 'var(--font-size-3xl)',
          marginBottom: 4,
        }}>
          Профиль
        </h1>
        <p className="text-hint" style={{ fontSize: 13 }}>
          Управление данными и настройками
        </p>
      </div>

      {/* Profile Card */}
      <Card style={{ 
        padding: 0, 
        overflow: 'hidden',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        marginBottom: 20,
      }}>
        {/* Avatar */}
        <div style={{
          background: 'var(--brand-gold-gradient)',
          padding: '28px 24px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid rgba(255,255,255,0.3)',
          }}>
            <IconUser size={32} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            {editing ? (
              <div>
                <input
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ваше имя"
                  style={{ 
                    background: 'rgba(255,255,255,0.15)', 
                    border: '1px solid rgba(255,255,255,0.3)', 
                    color: 'white',
                    marginBottom: 8,
                  }}
                />
                <input
                  type="tel"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+996 XXX XXX XXX"
                  style={{ 
                    background: 'rgba(255,255,255,0.15)', 
                    border: '1px solid rgba(255,255,255,0.3)', 
                    color: 'white',
                  }}
                />
              </div>
            ) : (
              <>
                <div style={{ color: 'white', fontWeight: 600, fontSize: 18, marginBottom: 4 }}>
                  {name || 'Пользователь'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                  {phone || `ID: ${user?.id || '—'}`}
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 12,
              padding: '8px 14px',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {editing ? 'Сохранить' : 'Изм.'}
          </button>
        </div>

        {/* Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          padding: '16px 20px',
          gap: 12,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-gold)' }}>
              {visitCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
              Визитов
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-gold)' }}>
              {totalSpent}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
              Потрачено
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-gold)' }}>
              {loyaltyProgress}/10
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
              До скидки
            </div>
          </div>
        </div>

        {/* Loyalty Progress Bar */}
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ 
            height: 6, 
            borderRadius: 3, 
            background: 'var(--gray-200)',
            overflow: 'hidden',
          }}>
            <div style={{ 
              height: '100%', 
              width: `${loyaltyProgress * 10}%`,
              background: 'var(--brand-gold-gradient)',
              borderRadius: 3,
              transition: 'width 500ms ease',
            }} />
          </div>
        </div>
      </Card>

      {/* Menu Items */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {menuItems.map((item, index) => (
          <div
            key={item.label}
            onClick={item.action}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '16px 20px',
              borderBottom: index < menuItems.length - 1 ? '1px solid var(--gray-100)' : 'none',
              cursor: item.action !== undefined ? 'pointer' : 'default',
              transition: 'background 200ms ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'var(--brand-gold-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-gold)',
              flexShrink: 0,
            }}>
              <item.icon size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 15 }}>{item.label}</div>
            </div>
            <IconChevronRight size={18} color="var(--gray-400)" />
          </div>
        ))}
      </Card>

      {/* Logout */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Button
          variant="ghost"
          onClick={() => {
            useAuthStore.getState().logout();
            navigate('/');
          }}
          style={{ color: 'var(--color-danger)' }}
        >
          Выйти из аккаунта
        </Button>
      </div>
    </div>
  );
}
