import { useEffect } from 'react';
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
  IconMapPin, IconClock,
} from '../components/Icons';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
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
    { id: 1, name: 'Айгуль', spec: 'Стрижки, окрашивание', rating: 4.9 },
    { id: 2, name: 'Диана', spec: 'Маникюр, педикюр', rating: 4.8 },
    { id: 3, name: 'Айгерим', spec: 'Макияж, брови', rating: 4.9 },
  ];

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <h1 className="page-title" style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--font-size-3xl)', marginBottom: 2 }}>
          Beauty Studio
        </h1>
        <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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

      {/* Promo Banner */}
      <div className="banner" style={{ position: 'relative' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="banner-title" style={{ fontFamily: 'var(--font-serif)' }}>
            Скидка 10%
          </div>
          <div className="banner-description">
            На первую запись. Запишитесь прямо сейчас!
          </div>
          <button className="banner-button" onClick={() => navigate('/booking')}>
            Записаться
          </button>
        </div>
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
                description="Запишитесь на удобное время прямо сейчас!"
                action={
                  <Button onClick={() => navigate('/booking')} leftIcon={<IconCalendar size={18} />}>
                    Записаться
                  </Button>
                }
              />
            </Card>
          )}

          {/* Services Categories */}
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--font-size-xl)', marginBottom: 16 }}>Категории</h2>
            <div className="grid grid-cols-2" style={{ gap: 12 }}>
              {categories.map((cat) => (
                <Card
                  key={cat.id}
                  interactive
                  onClick={() => navigate('/booking')}
                  style={{ margin: 0, textAlign: 'center', padding: 20 }}
                >
                  <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                    <cat.icon size={32} color="var(--brand-gold)" />
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>{cat.name}</div>
                  <div className="text-hint" style={{ fontSize: 12 }}>{cat.price}</div>
                </Card>
              ))}
            </div>
          </div>

          {/* Top Masters */}
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--font-size-xl)', marginBottom: 16 }}>Топ мастеров</h2>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
              {masters.map((master) => (
                <Card
                  key={master.id}
                  interactive
                  style={{ margin: 0, minWidth: 140, textAlign: 'center', padding: 16 }}
                >
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'var(--brand-gold-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px',
                    color: 'white',
                  }}>
                    <span style={{ fontSize: 20, fontWeight: 600 }}>{master.name[0]}</span>
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 2, fontSize: 14 }}>{master.name}</div>
                  <div className="text-hint" style={{ fontSize: 11, marginBottom: 6 }}>{master.spec}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--brand-gold)', fontSize: 12 }}>
                    <IconStar size={14} color="var(--brand-gold)" />
                    <span>{master.rating}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ marginTop: 24 }}>
            <Card bordered>
              <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: 12 }}>Ещё</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Button variant="ghost" onClick={() => navigate('/waitlist')} leftIcon={<IconList size={18} />} fullWidth style={{ justifyContent: 'flex-start' }}>
                  Лист ожидания
                </Button>
                <Button variant="ghost" onClick={() => navigate('/chat')} leftIcon={<IconMessage size={18} />} fullWidth style={{ justifyContent: 'flex-start' }}>
                  Чат с менеджером
                </Button>
                <Button variant="ghost" onClick={() => navigate('/loyalty')} leftIcon={<IconCrown size={18} />} fullWidth style={{ justifyContent: 'flex-start' }}>
                  Программа лояльности
                </Button>
              </div>
            </Card>
          </div>

          {/* Contact Card */}
          <Card bordered style={{ marginTop: 24 }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: 16 }}>Контакты</h3>
            <div>
              <p style={{ margin: '10px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconMapPin size={18} color="var(--brand-gold)" />
                <span style={{ fontSize: 14 }}>г. Бишкек, ул. Ахунбаева, 1</span>
              </p>
              <p style={{ margin: '10px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconPhone size={18} color="var(--brand-gold)" />
                <a href="tel:+996707001112" style={{ color: 'var(--brand-gold)', fontSize: 14 }}>
                  +996 707 001112
                </a>
              </p>
              <p style={{ margin: '10px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconClock size={18} color="var(--brand-gold)" />
                <span style={{ fontSize: 14 }}>Пн-Сб: 09:00 — 20:00</span>
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
