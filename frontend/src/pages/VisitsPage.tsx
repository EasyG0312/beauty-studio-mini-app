import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Card from '../components/Card';
import Button from '../components/Button';
import { IconChevronLeft, IconCalendar, IconUser, IconStar } from '../components/Icons';

interface Visit {
  id: number;
  date: string;
  time: string;
  service: string;
  master: string;
  price: number;
  status: 'completed' | 'cancelled' | 'no_show';
  hasReview: boolean;
  rating?: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const MOCK_VISITS: Visit[] = [
  {
    id: 1,
    date: '20.04.2026',
    time: '14:00',
    service: 'Маникюр + покрытие',
    master: 'Диана',
    price: 1200,
    status: 'completed',
    hasReview: true,
    rating: 5
  },
  {
    id: 2,
    date: '05.04.2026',
    time: '10:30',
    service: 'Стрижка',
    master: 'Айгуль',
    price: 800,
    status: 'completed',
    hasReview: false
  },
  {
    id: 3,
    date: '15.03.2026',
    time: '16:00',
    service: 'Окрашивание',
    master: 'Айгуль',
    price: 3500,
    status: 'completed',
    hasReview: true,
    rating: 4
  }
];

export default function VisitsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [visits, setVisits] = useState<Visit[]>(MOCK_VISITS);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    const chatId = user?.telegramUser?.id || user?.id;
    if (!chatId) {
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/bookings?chat_id=${chatId}&status_filter=completed&limit=50`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (response.ok) {
        const bookings = await response.json();
        // Преобразуем бронирования в визиты
        const visitsData = bookings
          .filter((b: any) => ['completed', 'cancelled', 'no_show'].includes(b.status))
          .map((b: any) => ({
            id: b.id,
            date: b.date,
            time: b.time,
            service: b.service,
            master: b.master,
            price: b.actual_amount || 0,
            status: b.status,
            hasReview: false // TODO: проверить есть ли отзыв
          }));
        setVisits(visitsData);
      }
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVisits = visits.filter(v => {
    if (filter === 'all') return true;
    return v.status === filter;
  });

  const stats = {
    total: visits.length,
    completed: visits.filter(v => v.status === 'completed').length,
    totalSpent: visits.reduce((sum, v) => sum + v.price, 0),
    withReviews: visits.filter(v => v.hasReview).length
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return { text: 'Выполнено', color: '#4CAF50' };
      case 'cancelled': return { text: 'Отменено', color: '#f44336' };
      case 'no_show': return { text: 'Не явился', color: '#FF9800' };
      default: return { text: status, color: '#999' };
    }
  };

  const canLeaveReview = (visit: Visit) => {
    return visit.status === 'completed' && !visit.hasReview;
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'none', border: 'none', padding: 8, marginLeft: -8, cursor: 'pointer' }}
        >
          <IconChevronLeft size={24} />
        </button>
        <h1 className="page-title" style={{ fontFamily: 'var(--font-serif)', margin: 0, flex: 1 }}>
          История посещений
        </h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
        <Card elevated style={{ background: '#4CAF50', color: '#fff' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.completed}</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Визитов</div>
        </Card>
        <Card elevated style={{ background: '#2196F3', color: '#fff' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.totalSpent.toLocaleString()} сом</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Всего потрачено</div>
        </Card>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'all', label: 'Все' },
          { id: 'completed', label: 'Выполнены' },
          { id: 'cancelled', label: 'Отмены' }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              background: filter === f.id ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
              color: filter === f.id ? '#fff' : 'var(--tg-theme-text-color)',
              fontSize: 13,
              cursor: 'pointer',
              flex: 1
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Visits List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredVisits.map(visit => {
          const status = getStatusLabel(visit.status);
          
          return (
            <Card key={visit.id}>
              <div style={{ display: 'flex', gap: 12 }}>
                {/* Date column */}
                <div style={{ 
                  textAlign: 'center', 
                  minWidth: 50,
                  padding: '8px 0'
                }}>
                  <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', textTransform: 'uppercase' }}>
                    {visit.date.split('.')[1]}.{visit.date.split('.')[2]}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    {visit.date.split('.')[0]}
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                      {visit.service}
                    </div>
                    <span style={{ 
                      fontSize: 11, 
                      color: status.color,
                      background: `${status.color}15`,
                      padding: '2px 8px',
                      borderRadius: 6,
                      flexShrink: 0
                    }}>
                      {status.text}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <IconUser size={14} />
                      {visit.master}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconCalendar size={14} />
                      {visit.time}
                    </span>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px solid var(--tg-theme-secondary-bg-color)'
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 18, color: '#4CAF50' }}>
                      {visit.price.toLocaleString()} сом
                    </div>

                    {canLeaveReview(visit) ? (
                      <button
                        onClick={() => navigate(`/create-review?booking=${visit.id}`)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#fff3e0',
                          color: '#FF9800',
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <IconStar size={14} />
                        Оценить
                      </button>
                    ) : visit.hasReview ? (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 4,
                        color: '#FFD700',
                        fontSize: 14
                      }}>
                        {'⭐'.repeat(visit.rating || 0)}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredVisits.length === 0 && !loading && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 16, color: 'var(--tg-theme-hint-color)' }}>
            История посещений пуста
          </div>
          <Button onClick={() => navigate('/booking')} variant="primary" style={{ marginTop: 16 }}>
            Записаться
          </Button>
        </Card>
      )}
    </div>
  );
}
