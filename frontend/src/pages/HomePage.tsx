import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useBookingStore } from '../store/bookingStore';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, loginAsAdmin, login } = useAuthStore();
  const { bookings, fetchBookings } = useBookingStore();

  useEffect(() => {
    if (user) {
      fetchBookings({ chat_id: user.id, status_filter: 'confirmed' });
    }
  }, [user]);

  const nextBooking = bookings.find((b) => {
    const bookingDate = new Date(b.date.split('.').reverse().join('-'));
    return bookingDate >= new Date();
  });

  const stories = [
    { id: 1, icon: '💅', label: 'Акции' },
    { id: 2, icon: '💇', label: 'Стрижки' },
    { id: 3, icon: '💄', label: 'Макияж' },
    { id: 4, icon: '💆', label: 'Массаж' },
    { id: 5, icon: '⭐', label: 'Отзывы' },
  ];

  const categories = [
    { id: 1, icon: '💇', name: 'Стрижки', price: 'от 1200 с.' },
    { id: 2, icon: '💅', name: 'Маникюр', price: 'от 900 с.' },
    { id: 3, icon: '💄', name: 'Макияж', price: 'от 1800 с.' },
    { id: 4, icon: '💆', name: 'Массаж', price: 'от 1500 с.' },
  ];

  const masters = [
    { id: 1, name: 'Айгуль', spec: 'Стрижки', rating: 4.9, avatar: '👩‍🦰' },
    { id: 2, name: 'Диана', spec: 'Маникюр', rating: 4.8, avatar: '👩‍🦱' },
    { id: 3, name: 'Айгерим', spec: 'Макияж', rating: 4.9, avatar: '👩' },
  ];

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">💅 Beauty Studio</h1>
        <p className="page-subtitle">Бишкек, ул. Ахунбаева, 1</p>
      </div>

      {/* Stories */}
      <div className="stories-container">
        {stories.map((story) => (
          <div key={story.id} className="story-item">
            <div className="story-avatar">
              <div className="story-avatar-inner">{story.icon}</div>
            </div>
            <span className="story-label">{story.label}</span>
          </div>
        ))}
      </div>

      {/* Promo Banner */}
      <Card className="banner">
        <div className="banner-title">🎉 Скидка 10%</div>
        <div className="banner-description">
          На первую запись! Запишитесь прямо сейчас.
        </div>
        <button 
          className="banner-button"
          onClick={() => navigate('/booking')}
        >
          Записаться
        </button>
      </Card>

      {user?.role === 'manager' || user?.role === 'owner' ? (
        <Card elevated>
          <h2>Панель управления</h2>
          <p className="text-hint mb-3">
            Роль: <strong>{user.role === 'manager' ? 'Менеджер' : 'Владелец'}</strong>
          </p>
          <div className="flex flex-col gap-2">
            {user.role === 'manager' ? (
              <Button 
                onClick={() => navigate('/manager')}
                leftIcon="📊"
              >
                Открыть дашборд
              </Button>
            ) : (
              <>
                <Button 
                  onClick={() => navigate('/manager')}
                  leftIcon="📊"
                  className="mb-2"
                >
                  Дашборд менеджера
                </Button>
                <Button 
                  onClick={() => navigate('/analytics')}
                  variant="secondary"
                  leftIcon="📈"
                >
                  Аналитика
                </Button>
              </>
            )}
            <Button 
              onClick={() => navigate('/chat')}
              variant="ghost"
              leftIcon="💬"
            >
              Чат с клиентами
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Next Booking Card */}
          {nextBooking ? (
            <Card elevated interactive onClick={() => navigate('/my-bookings')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <p className="text-hint" style={{ fontSize: '12px', marginBottom: '4px' }}>
                    Следующая запись
                  </p>
                  <h3 style={{ margin: 0 }}>{nextBooking.service}</h3>
                </div>
                <Badge status={nextBooking.status} />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '12px',
                  background: 'var(--brand-gold-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}>
                  📅
                </div>
                <div>
                  <p style={{ fontWeight: '600', margin: 0 }}>
                    {nextBooking.date} в {nextBooking.time}
                  </p>
                  <p className="text-hint" style={{ margin: 0, fontSize: '14px' }}>
                    💇 {nextBooking.master}
                  </p>
                </div>
              </div>

              <Button
                variant="secondary"
                fullWidth
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/my-bookings');
                }}
              >
                Все записи
              </Button>
            </Card>
          ) : (
            <Card elevated>
              <EmptyState
                icon="📅"
                title="Нет активных записей"
                description="Запишитесь на удобное время прямо сейчас!"
                action={
                  <Button 
                    onClick={() => navigate('/booking')}
                    leftIcon="✏️"
                  >
                    Записаться
                  </Button>
                }
              />
            </Card>
          )}

          {/* Services Categories */}
          <div style={{ marginTop: '24px' }}>
            <h2 style={{ marginBottom: '12px' }}>Категории</h2>
            <div className="grid grid-cols-2" style={{ gap: '12px' }}>
              {categories.map((cat) => (
                <Card 
                  key={cat.id} 
                  interactive 
                  onClick={() => navigate('/booking')}
                  style={{ margin: 0, textAlign: 'center' }}
                >
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>{cat.icon}</div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>{cat.name}</div>
                  <div className="text-hint" style={{ fontSize: '12px' }}>{cat.price}</div>
                </Card>
              ))}
            </div>
          </div>

          {/* Top Masters */}
          <div style={{ marginTop: '24px' }}>
            <h2 style={{ marginBottom: '12px' }}>Топ мастеров</h2>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
              {masters.map((master) => (
                <Card 
                  key={master.id} 
                  interactive
                  style={{ 
                    margin: 0, 
                    minWidth: '140px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '50%',
                    background: 'var(--brand-gold-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 8px',
                    fontSize: '28px',
                  }}>
                    {master.avatar}
                  </div>
                  <div style={{ fontWeight: '600', marginBottom: '2px' }}>{master.name}</div>
                  <div className="text-hint" style={{ fontSize: '12px', marginBottom: '4px' }}>{master.spec}</div>
                  <div style={{ color: 'var(--brand-gold)', fontSize: '12px' }}>⭐ {master.rating}</div>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ marginTop: '24px' }}>
            <Card bordered>
              <h3>Ещё</h3>
              <div className="flex flex-col gap-2" style={{ marginTop: '12px' }}>
                <Button variant="ghost" onClick={() => navigate('/waitlist')} leftIcon="📋">
                  Лист ожидания
                </Button>
                <Button variant="ghost" onClick={() => navigate('/chat')} leftIcon="💬">
                  Чат с менеджером
                </Button>
                <Button variant="ghost" onClick={() => navigate('/loyalty')} leftIcon="👑">
                  Программа лояльности
                </Button>
              </div>
            </Card>
          </div>

          {/* Demo Admin Button */}
          {!user && (
            <Card bordered style={{ marginTop: '24px', borderColor: '#FF9800' }}>
              <h3>🔧 Вход</h3>
              <p className="text-hint" style={{ fontSize: '13px', marginTop: '8px' }}>
                Для тестирования выберите режим:
              </p>
              <div className="flex flex-col gap-2" style={{ marginTop: '12px' }}>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => {
                    login();
                    alert('Попытка входа через Telegram. Проверьте консоль (F12) для деталей.');
                  }}
                >
                  🔑 Войти через Telegram
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={loginAsAdmin}
                >
                  👑 Демо-режим (админ)
                </Button>
              </div>
            </Card>
          )}

          {/* Contact Card */}
          <Card bordered style={{ marginTop: '24px' }}>
            <h3>Контакты</h3>
            <div style={{ marginTop: '12px' }}>
              <p style={{ margin: '8px 0' }}>
                <span style={{ marginRight: '8px' }}>📍</span>
                г. Бишкек, ул. Ахунбаева, 1
              </p>
              <p style={{ margin: '8px 0' }}>
                <span style={{ marginRight: '8px' }}>📞</span>
                <a href="tel:+996707001112" style={{ color: 'var(--brand-gold)' }}>
                  +996 707 001112
                </a>
              </p>
              <p style={{ margin: '8px 0' }}>
                <span style={{ marginRight: '8px' }}>🕒</span>
                Пн-Сб: 09:00 - 20:00
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
