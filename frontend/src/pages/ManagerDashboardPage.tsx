import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBookings, updateBooking, getClients, updateClientNotes, getWaitlist } from '../services/api';
import type { Booking, Client, Waitlist } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { CANCEL_REASONS } from '../types';

export default function ManagerDashboardPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [waitlist, setWaitlist] = useState<Waitlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'today' | 'all' | 'waitlist' | 'clients'>('today');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [notes, setNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState<number | null>(null);

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
  const todayBookings = bookings.filter((b) => b.date === today);

  return (
    <div className="page">
      <h1>Панель менеджера</h1>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{todayBookings.length}</div>
            <div className="text-hint" style={{ fontSize: '12px' }}>Сегодня</div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {bookings.filter((b) => b.status === 'confirmed').length}
            </div>
            <div className="text-hint" style={{ fontSize: '12px' }}>Подтверждено</div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {bookings.filter((b) => b.status === 'pending').length}
            </div>
            <div className="text-hint" style={{ fontSize: '12px' }}>Ожидает</div>
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <Button onClick={() => navigate('/chat')} style={{ flex: 1 }}>
          💬 Чат
        </Button>
        <Button onClick={() => navigate('/waitlist')} style={{ flex: 1 }}>
          📋 Лист ожидания
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
          Все
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
          ✅ Подтвердить все ожидающие ({bookings.filter((b) => b.status === 'pending' && b.date === today).length})
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
          {clients.map((client) => (
            <Card key={client.chat_id} className="mb-2">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3>{client.name}</h3>
                  <p className="text-hint">{client.phone}</p>
                  <p className="text-hint" style={{ fontSize: '12px' }}>
                    Визитов: {client.visit_count} | Последний: {client.last_visit}
                  </p>
                  {client.is_loyal && (
                    <span style={{
                      background: '#4CAF50',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                    }}>
                      Постоянный клиент
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => openClientNotes(client)}
                  style={{ fontSize: '12px', padding: '4px 8px' }}
                >
                  📝 Заметки
                </Button>
              </div>
            </Card>
          ))}
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
                <Card key={booking.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{booking.time}</div>
                      <div><strong>{booking.name}</strong></div>
                      <div className="text-hint">{booking.service} | {booking.master}</div>
                      {booking.comment && (
                        <div className="text-hint" style={{ fontSize: '14px', marginTop: '4px' }}>
                          💬 {booking.comment}
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
                          display: 'inline-block',
                        }}>
                          🚗 Клиент выезжает
                        </div>
                      )}
                    </div>
                    <Badge status={booking.status} />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {booking.status === 'pending' && (
                      <>
                        <Button onClick={() => handleConfirm(booking.id)} style={{ flex: 1 }}>
                          Подтвердить
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleOnTheWay(booking.id)}
                          style={{ flex: 1 }}
                        >
                          🚗 Я выезжаю
                        </Button>
                      </>
                    )}
                    {booking.status === 'confirmed' && (
                      <>
                        <Button onClick={() => handleComplete(booking.id)} style={{ flex: 1 }}>
                          ✅ Визит завершён
                        </Button>
                        <Button variant="danger" onClick={() => handleNoShow(booking.id)} style={{ flex: 1 }}>
                          ❌ Не явился
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
        }}>
          <Card>
            <h3>Заметки: {selectedClient.name}</h3>
            <p className="text-hint" style={{ fontSize: '12px' }}>{selectedClient.phone}</p>
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
