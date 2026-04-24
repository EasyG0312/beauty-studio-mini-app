import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useBookingStore } from '../store/bookingStore';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import {
  IconScissors, IconNailPolish, IconMakeup, IconMassage,
  IconStar, IconCalendar, IconChart,
  IconMessage, IconList, IconCrown, IconPhone,
  IconMapPin, IconClock, IconUser,
} from '../components/Icons';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, loginAsAdmin } = useAuthStore();
  const { bookings, fetchBookings } = useBookingStore();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBookings({ chat_id: user.id, status_filter: 'confirmed' });
    }
    
    // Sticky header — blur при скролле
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [user]);

  const nextBooking = bookings.find((b) => {
    const bookingDate = new Date(b.date.split('.').reverse().join('-'));
    return bookingDate >= new Date();
  });

  const stories = [
    { id: 1, icon: IconStar, label: 'Акции' },
    { id: 2, icon: IconScissors, label: 'Стрижки' },
    { id: 3, icon: IconMakeup, label: 'Макияж' },
    { id: 4, icon: IconMassage, label: 'Массаж' },
    { id: 5, icon: IconStar, label: 'Отзывы' },
  ];

  const categories = [
    { id: 1, icon: IconScissors, name: 'Стрижки', price: 'от 1200 с.' },
    { id: 2, icon: IconNailPolish, name: 'Маникюр', price: 'от 900 с.' },
    { id: 3, icon: IconMakeup, name: 'Макияж', price: 'от 1800 с.' },
    { id: 4, icon: IconMassage, name: 'Массаж', price: 'от 1500 с.' },
  ];

  const masters = [
    { id: 1, name: 'Айгуль', spec: 'Стрижки, окрашивание', rating: 4.9, photo: '' },
    { id: 2, name: 'Диана', spec: 'Маникюр, педикюр', rating: 4.8, photo: '' },
    { id: 3, name: 'Айгерим', spec: 'Макияж, брови', rating: 4.9, photo: '' },
  ];

  return (
    <div className="page">
      {/* Header — sticky с blur при скролле */}
      <div className="page-header" style={{ 
        borderBottom: 'none', 
        paddingBottom: 0, 
        marginBottom: scrolled ? 24 : 32,
        background: scrolled ? 'var(--glass-bg)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(150%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(150%)' : 'none',
        transition: 'all 300ms ease',
        marginTop: scrolled ? -8 : 0,
        marginLeft: scrolled ? -8 : 0,
        marginRight: scrolled ? -8 : 0,
        paddingLeft: scrolled ? 12 : 0,
        paddingRight: scrolled ? 12 : 0,
      }}>
        <h1 className="page-title" style={{ 
          fontFamily: 'var(--font-serif)', 
          fontSize: scrolled ? 'var(--font-size-2xl)' : 'var(--font-size-3xl)',
          marginBottom: 8,
          letterSpacing: '-0.02em',
          transition: 'font-size 300ms ease',
        }}>
          Beauty Studio
        </h1>
        <p className="page-subtitle" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8,
          color: 'var(--gray-500)',
          letterSpacing: '0.02em',
          opacity: scrolled ? 0.7 : 1,
          transition: 'opacity 300ms ease',
        }}>
          <IconMapPin size={14} />
          Бишкек, ул. Ахунбаева, 1
        </p>
      </div>

      {/* Stories */}
      <div className="stories-container">
        {stories.map((story) => (
          <div key={story.id} className="story-item">
            <div className="story-avatar">
              <div className="story-avatar-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <story.icon size={24} color="var(--brand-gold)" />
              </div>
            </div>
            <span className="story-label">{story.label}</span>
          </div>
        ))}
      </div>

      {/* Booking Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--font-size-xl)', marginBottom: 8 }}>
          Запись онлайн
        </h2>
        <Button
          onClick={() => navigate('/booking/master')}
          leftIcon={<IconUser size={20} />}
          size="lg"
          fullWidth
        >
          Выбрать специалиста
        </Button>
        <Button
          onClick={() => navigate('/booking/datetime')}
          leftIcon={<IconCalendar size={20} />}
          size="lg"
          fullWidth
          variant="secondary"
        >
          Выбрать дату и время
        </Button>
      </div>

      {user?.role === 'manager' || user?.role === 'owner' ? (
        <Card elevated>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--font-size-xl)', marginBottom: 16 }}>
            Панель управления
          </h2>
          <p className="text-hint" style={{ marginBottom: 16 }}>
            Роль: <strong style={{ color: 'var(--brand-gold)' }}>{user.role === 'manager' ? 'Менеджер' : 'Владелец'}</strong>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {user.role === 'manager' ? (
              <Button onClick={() => navigate('/manager')} leftIcon={<IconChart size={18} />}>
                Открыть дашборд
              </Button>
            ) : (
              <>
                <Button onClick={() => navigate('/manager')} leftIcon={<IconChart size={18} />} style={{ marginBottom: 4 }}>
                  Дашборд
                </Button>
                <Button onClick={() => navigate('/analytics')} variant="secondary" leftIcon={<IconChart size={18} />}>
                  Аналитика
                </Button>
              </>
            )}
            <Button onClick={() => navigate('/chat')} variant="ghost" leftIcon={<IconMessage size={18} />}>
              Чат с клиентами
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Next Booking Card */}
          {nextBooking ? (
            <Card elevated interactive onClick={() => navigate('/my-bookings')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <p className="text-hint" style={{ fontSize: 12, marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Следующая запись
                  </p>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>{nextBooking.service}</h3>
                </div>
                <Badge status={nextBooking.status} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'var(--brand-gold-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-gold)',
                }}>
                  <IconCalendar size={22} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, margin: 0, fontSize: 15 }}>
                    {nextBooking.date} в {nextBooking.time}
                  </p>
                  <p className="text-hint" style={{ margin: 0, fontSize: 13 }}>
                    {nextBooking.master}
                  </p>
                </div>
              </div>

              <Button variant="secondary" fullWidth onClick={(e) => { e.stopPropagation(); navigate('/my-bookings'); }}>
                Все записи
              </Button>
            </Card>
          ) : (
            <Card elevated>
              <EmptyState
                icon={<IconCalendar size={48} />}
                title="Нет активных записей"
                description="Выберите специалиста или дату для записи выше"
              />
            </Card>
          )}

          {/* Services Categories — увеличенный padding */}
          <div style={{ marginTop: 32 }}>
            <h2 style={{ 
              fontFamily: 'var(--font-serif)', 
              fontSize: 'var(--font-size-lg)', 
              marginBottom: 16,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--gray-600)',
              fontWeight: 500,
            }}>
              Категории
            </h2>
            <div className="grid grid-cols-2" style={{ gap: 14 }}>
              {categories.map((cat) => (
                <Card
                  key={cat.id}
                  interactive
                  onClick={() => navigate('/booking')}
                  style={{ 
                    margin: 0, 
                    textAlign: 'center', 
                    padding: 24,
                    borderRadius: 18,
                  }}
                >
                  <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}>
                    <cat.icon size={28} color="var(--brand-gold)" />
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 15 }}>{cat.name}</div>
                  <div className="text-hint" style={{ fontSize: 12 }}>{cat.price}</div>
                </Card>
              ))}
            </div>
          </div>

          {/* Top Masters — фото вместо букв, тусклое золото */}
          <div style={{ marginTop: 32 }}>
            <h2 style={{ 
              fontFamily: 'var(--font-serif)', 
              fontSize: 'var(--font-size-lg)', 
              marginBottom: 16,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--gray-600)',
              fontWeight: 500,
            }}>
              Топ мастеров
            </h2>
            <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
              {masters.map((master) => (
                <Card
                  key={master.id}
                  interactive
                  style={{ 
                    margin: 0, 
                    minWidth: 156, 
                    textAlign: 'center', 
                    padding: 0,
                    borderRadius: 20,
                    overflow: 'hidden',
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {/* Фото мастера */}
                  <div style={{
                    width: '100%',
                    height: 120,
                    background: 'linear-gradient(135deg, #1A1A1C 0%, #252528 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                    {master.photo ? (
                      <img 
                        src={master.photo} 
                        alt={master.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <IconUser size={40} color="var(--gray-400)" />
                    )}
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>{master.name}</div>
                    <div style={{ fontSize: 11, marginBottom: 8, lineHeight: 1.4, color: 'var(--gray-500)' }}>
                      {master.spec}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: 4, 
                      color: '#A89060',
                      fontSize: 12,
                      opacity: 0.8,
                    }}>
                      <IconStar size={13} color="#A89060" />
                      <span>{master.rating}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Actions — Glassmorphism */}
          <div style={{ marginTop: 32 }}>
            <Card 
              bordered 
              style={{ 
                padding: 24,
                borderRadius: 20,
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <h3 style={{ 
                fontFamily: 'var(--font-serif)', 
                marginBottom: 16,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontSize: 'var(--font-size-lg)',
                fontWeight: 500,
                color: 'var(--gray-600)',
              }}>
                Ещё
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Button variant="ghost" onClick={() => navigate('/waitlist')} leftIcon={<IconList size={18} />} fullWidth style={{ justifyContent: 'flex-start', padding: '14px 12px' }}>
                  Лист ожидания
                </Button>
                <Button variant="ghost" onClick={() => navigate('/chat')} leftIcon={<IconMessage size={18} />} fullWidth style={{ justifyContent: 'flex-start', padding: '14px 12px' }}>
                  Чат с менеджером
                </Button>
                <Button variant="ghost" onClick={() => navigate('/loyalty')} leftIcon={<IconCrown size={18} />} fullWidth style={{ justifyContent: 'flex-start', padding: '14px 12px' }}>
                  Программа лояльности
                </Button>
              </div>
            </Card>
          </div>

          {/* Contact Card — Glassmorphism, мягкие цвета */}
          <Card 
            bordered 
            style={{ 
              marginTop: 32,
              padding: 24,
              borderRadius: 20,
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <h3 style={{ 
              fontFamily: 'var(--font-serif)', 
              marginBottom: 20,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontSize: 'var(--font-size-lg)',
              fontWeight: 500,
              color: 'var(--gray-600)',
            }}>
              Контакты
            </h3>
            <div>
              <p style={{ 
                margin: '12px 0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                color: '#B5B0A3',
                fontSize: 14,
              }}>
                <IconMapPin size={18} color="var(--brand-gold)" />
                <span>г. Бишкек, ул. Ахунбаева, 1</span>
              </p>
              <p style={{ 
                margin: '12px 0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                color: '#B5B0A3',
                fontSize: 14,
              }}>
                <IconPhone size={18} color="var(--brand-gold)" />
                <a href="tel:+996707001112" style={{ 
                  color: '#D4B97A',
                  textDecoration: 'none',
                }}>
                  +996 707 001112
                </a>
              </p>
              <p style={{ 
                margin: '12px 0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                color: '#B5B0A3',
                fontSize: 14,
              }}>
                <IconClock size={18} color="var(--brand-gold)" />
                <span>Пн-Сб: 09:00 — 20:00</span>
              </p>
            </div>
          </Card>
        </>
      )}

      {/* Fallback: если Telegram авторизация не сработала — вход как владелец */}
      {!user && (
        <Card style={{ marginTop: 32, padding: 24, borderRadius: 20, textAlign: 'center' }}>
          <div style={{ marginBottom: 16 }}>
            <IconUser size={40} color="var(--gray-400)" />
            <p className="text-hint" style={{ marginTop: 8, fontSize: 13 }}>
              Авторизация через Telegram не удалась
            </p>
          </div>
          <Button
            fullWidth
            variant="secondary"
            onClick={() => {
              loginAsAdmin();
              navigate('/manager');
            }}
            leftIcon={<IconCrown size={18} />}
          >
            Войти как владелец (демо)
          </Button>
          <p className="text-hint" style={{ marginTop: 12, fontSize: 11 }}>
            Только для тестирования. В продакшене — авторизация через Telegram.
          </p>
        </Card>
      )}
    </div>
  );
}
