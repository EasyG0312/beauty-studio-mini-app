import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBookings, updateBooking, getClients, updateClientNotes, getWaitlist, getAnalyticsSummary } from '../services/api';
import type { Booking, Client, Waitlist, AnalyticsSummary } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { CANCEL_REASONS } from '../types';
import {
  IconCheck,
  IconX,
  IconClock,
  IconUser,
  IconMessage,
  IconList,
  IconCalendar,
  IconSearch,
  IconStar,
  IconCrown,
  IconChart,
  IconUsers,
  IconScissors,
} from '../components/Icons';

export default function ManagerDashboardPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [waitlist, setWaitlist] = useState<Waitlist[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'today' | 'all' | 'waitlist' | 'clients'>('today');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [notes, setNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadBookings();
  }, [tab]);

  useEffect(() => {
    if (tab === 'clients') {
      loadClients();
    }
    if (tab === 'waitlist') {
      loadWaitlistData();
    }
  }, [tab]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const today = new Date().toLocaleDateString('ru-RU');
      const data = await getBookings(tab === 'today' ? { date: today } : {});
      setBookings(data);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const data = await getClients();
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const loadWaitlistData = async () => {
    try {
      const data = await getWaitlist();
      setWaitlist(data);
    } catch (error) {
      console.error('Failed to load waitlist:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await getAnalyticsSummary();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleConfirm = async (id: number) => {
    try {
      await updateBooking(id, { status: 'confirmed' });
      setBookings(bookings.map((b) =>
        b.id === id ? { ...b, status: 'confirmed' } : b
      ));
      alert('Запись подтверждена');
    } catch (error) {
      alert('Ошибка при подтверждении');
    }
  };

  const handleComplete = async (id: number) => {
    const amount = prompt('Введите сумму чека (сом):');
    if (amount) {
      try {
        await updateBooking(id, { status: 'completed', actual_amount: parseInt(amount) });
        setBookings(bookings.map((b) =>
          b.id === id ? { ...b, status: 'completed', actual_amount: parseInt(amount) } : b
        ));
        alert('Визит завершён');
      } catch (error) {
        alert('Ошибка');
      }
    }
  };

  const handleNoShow = async (id: number) => {
    if (confirm('Отметить клиента как не явившегося?')) {
      try {
        await updateBooking(id, { status: 'no_show' });
        setBookings(bookings.map((b) =>
          b.id === id ? { ...b, status: 'no_show' } : b
        ));
      } catch (error) {
        alert('Ошибка');
      }
    }
  };

  const handleCancel = async (id: number, reason: string) => {
    try {
      await updateBooking(id, { status: 'cancelled', cancel_reason: reason });
      setBookings(bookings.map((b) =>
        b.id === id ? { ...b, status: 'cancelled', cancel_reason: reason } : b
      ));
      setShowCancelModal(null);
      setCancelReason('');
      alert('Запись отменена');
    } catch (error) {
      alert('Ошибка');
    }
  };

  const handleBulkConfirm = async () => {
    const today = new Date().toLocaleDateString('ru-RU');
    const pending = bookings.filter((b) => b.status === 'pending' && b.date === today);

    if (confirm(`Подтвердить ${pending.length} записей?`)) {
      for (const booking of pending) {
        await updateBooking(booking.id, { status: 'confirmed' });
      }
      loadBookings();
    }
  };

  const handleOnTheWay = async (id: number) => {
    try {
      await updateBooking(id, { is_on_the_way: true });
      setBookings(bookings.map((b) =>
        b.id === id ? { ...b, is_on_the_way: true } : b
      ));
      alert('Мастер уведомлён: клиент выезжает');
    } catch (error) {
      alert('Ошибка');
    }
  };

  const handleSaveNotes = async (client: Client) => {
    try {
      await updateClientNotes(client.chat_id, notes);
      alert('Заметки сохранены');
      setSelectedClient(null);
    } catch (error) {
      alert('Ошибка при сохранении');
    }
  };

  const openClientNotes = (client: Client) => {
    setSelectedClient(client);
    setNotes(client.notes || '');
  };

  const today = new Date().toLocaleDateString('ru-RU');

  // Фильтрация клиентов по поиску
  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone.includes(searchQuery)
  );

  return (
    <div className="page">
      <h1 style={{ fontFamily: 'var(--font-serif)' }}>
        <IconChart size={28} /> Панель менеджера
      </h1>

      {/* Quick Stats */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--brand-gold)' }}>{analytics.today_bookings}</div>
              <div className="text-hint" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><IconCalendar size={14} /> Сегодня</div>
            </div>
          </Card>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--brand-gold)' }}>{analytics.confirmed}</div>
              <div className="text-hint" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><IconCheck size={14} /> Подтверждено</div>
            </div>
          </Card>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--brand-gold)' }}>{analytics.week_bookings}</div>
              <div className="text-hint" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><IconChart size={14} /> За неделю</div>
            </div>
          </Card>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--brand-gold)' }}>{analytics.total_clients}</div>
              <div className="text-hint" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><IconUsers size={14} /> Клиенты</div>
            </div>
          </Card>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
        <Button onClick={() => navigate('/chat')} style={{ padding: '12px' }}>
          <IconMessage size={18} /> Чат
        </Button>
        <Button onClick={() => navigate('/notifications')} style={{ padding: '12px' }}>
          <IconClock size={18} /> Уведомления
        </Button>
        <Button onClick={() => navigate('/waitlist')} style={{ padding: '12px' }}>
          <IconList size={18} /> Лист ожидания
        </Button>
        <Button onClick={() => navigate('/reviews')} style={{ padding: '12px' }}>
          <IconStar size={18} /> Отзывы
        </Button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto' }}>
        <Button
          variant={tab === 'today' ? 'primary' : 'secondary'}
          onClick={() => setTab('today')}
          style={{ flex: 'none' }}
        >
          Сегодня
        </Button>
        <Button
          variant={tab === 'all' ? 'primary' : 'secondary'}
          onClick={() => setTab('all')}
          style={{ flex: 'none' }}
        >
          Все записи
        </Button>
        <Button
          variant={tab === 'waitlist' ? 'primary' : 'secondary'}
          onClick={() => setTab('waitlist')}
          style={{ flex: 'none' }}
        >
          Лист ожидания
        </Button>
        <Button
          variant={tab === 'clients' ? 'primary' : 'secondary'}
          onClick={() => setTab('clients')}
          style={{ flex: 'none' }}
        >
          Клиенты
        </Button>
      </div>

      {/* Bulk action */}
      {tab === 'today' && bookings.some((b) => b.status === 'pending' && b.date === today) && (
        <Button onClick={handleBulkConfirm} className="mb-2">
          <IconCheck size={18} /> Подтвердить все ожидающие ({bookings.filter((b) => b.status === 'pending' && b.date === today).length})
        </Button>
      )}

      {/* Waitlist tab */}
      {tab === 'waitlist' && (
        <>
          {waitlist.length === 0 ? (
            <Card>
              <p className="text-center text-hint">Лист ожидания пуст</p>
            </Card>
          ) : (
            waitlist.map((item) => (
              <Card key={item.id} className="mb-2">
                <div>
                  <h3>{item.name}</h3>
                  <p className="text-hint">
                    {item.date} в {item.time} | {item.master}
                  </p>
                  {item.service && <p className="text-hint">{item.service}</p>}
                  <p className="text-hint" style={{ fontSize: '11px' }}>Добавлен: {item.created_at}</p>
                </div>
              </Card>
            ))
          )}
        </>
      )}

      {/* Clients tab */}
      {tab === 'clients' && (
        <>
          {/* Поиск */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none' }}>
              <IconSearch size={18} />
            </div>
            <input
              type="text"
              className="input"
              placeholder="Поиск по имени или телефону..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>

          {filteredClients.length === 0 ? (
            <Card>
              <p className="text-center text-hint">Клиенты не найдены</p>
            </Card>
          ) : (
            filteredClients.map((client) => (
              <Card key={client.chat_id} className="mb-2">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: '4px' }}>{client.name}</h3>
                    <p className="text-hint" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}><IconUser size={14} /> {client.phone}</p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      <span className="text-hint" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <IconChart size={12} /> Визитов: <strong>{client.visit_count}</strong>
                      </span>
                      <span className="text-hint" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <IconCalendar size={12} /> Последний: {client.last_visit}
                      </span>
                    </div>
                    {client.is_loyal && (
                      <span style={{
                        background: 'var(--brand-gold)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        marginTop: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        <IconCrown size={12} /> Постоянный клиент
                      </span>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => openClientNotes(client)}
                    style={{ fontSize: '12px', padding: '4px 8px', marginLeft: '8px' }}
                  >
                    <IconMessage size={16} />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </>
      )}

      {/* Bookings list */}
      {(tab === 'today' || tab === 'all') && (
        <>
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : bookings.length === 0 ? (
            <Card>
              <p className="text-center text-hint">Нет записей</p>
            </Card>
          ) : (
            bookings
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((booking) => (
                <Card key={booking.id} className="mb-2">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--brand-gold)' }}>{booking.time}</span>
                        <Badge status={booking.status} />
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>{booking.name}</div>
                      <div className="text-hint" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><IconUser size={14} /> {booking.phone}</div>
                      <div className="text-hint" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><IconScissors size={14} /> {booking.service} | {booking.master}</div>
                      {booking.comment && (
                        <div className="text-hint" style={{ fontSize: '14px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <IconMessage size={14} /> {booking.comment}
                        </div>
                      )}
                      {booking.is_on_the_way && (
                        <div style={{
                          background: '#2196F3',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          marginTop: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <IconClock size={14} /> Клиент выезжает
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {booking.status === 'pending' && (
                      <>
                        <Button onClick={() => handleConfirm(booking.id)} style={{ flex: 1 }}>
                          <IconCheck size={18} /> Подтвердить
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleOnTheWay(booking.id)}
                          style={{ flex: 1 }}
                        >
                          <IconClock size={18} /> Я выезжаю
                        </Button>
                      </>
                    )}
                    {(booking.status === 'confirmed' || booking.status === 'arrived') && (
                      <>
                        <Button onClick={() => handleComplete(booking.id)} style={{ flex: 1 }}>
                          <IconCheck size={18} /> Визит завершён
                        </Button>
                        <Button variant="danger" onClick={() => handleNoShow(booking.id)} style={{ flex: 1 }}>
                          <IconX size={18} /> Не явился
                        </Button>
                      </>
                    )}
                    {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                      <Button
                        variant="danger"
                        onClick={() => setShowCancelModal(booking.id)}
                        style={{ flex: 1 }}
                      >
                        Отменить
                      </Button>
                    )}
                  </div>

                  {booking.cancel_reason && (
                    <p className="text-hint" style={{ fontSize: '12px', marginTop: '8px' }}>
                      Причина отмены: {booking.cancel_reason}
                    </p>
                  )}
                </Card>
              ))
          )}
        </>
      )}

      {/* Cancel reason modal */}
      {showCancelModal !== null && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
        }}>
          <Card>
            <h3>Причина отмены</h3>
            <select
              className="input mt-2"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            >
              <option value="">Выберите причину</option>
              {CANCEL_REASONS.map((reason) => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <Button
                fullWidth
                onClick={() => handleCancel(showCancelModal, cancelReason)}
                disabled={!cancelReason}
              >
                Отменить
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowCancelModal(null);
                  setCancelReason('');
                }}
              >
                Закрыть
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Client notes modal */}
      {selectedClient && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
        }}>
          <Card>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><IconMessage size={20} /> Заметки: {selectedClient.name}</h3>
            <p className="text-hint" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><IconUser size={14} /> {selectedClient.phone}</p>
            <textarea
              className="input mt-2"
              placeholder="Аллергии, предпочтения, заметки..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <Button fullWidth onClick={() => handleSaveNotes(selectedClient)}>
                Сохранить
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setSelectedClient(null)}
              >
                Закрыть
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
