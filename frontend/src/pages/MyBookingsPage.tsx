import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useBookingStore } from '../store/bookingStore';
import { rescheduleBooking, cancelBooking as apiCancelBooking } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { IconChevronLeft, IconMessage } from '../components/Icons';
import type { Booking } from '../types';

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { bookings, fetchBookings } = useBookingStore();
  const [filter, setFilter] = useState<'active' | 'history'>('active');
  const [rescheduleModal, setRescheduleModal] = useState<{
    open: boolean;
    booking: Booking | null;
    newDate: string;
    newTime: string;
    reason: string;
  }>({ open: false, booking: null, newDate: '', newTime: '', reason: '' });

  useEffect(() => {
    if (user) {
      fetchBookings({ chat_id: user.id });
    }
  }, [user]);

  const activeBookings = bookings.filter((b) =>
    ['pending', 'confirmed'].includes(b.status)
  );

  const historyBookings = bookings.filter((b) =>
    ['completed', 'cancelled', 'no_show'].includes(b.status)
  ).slice(0, 10);

  const handleCancel = async (id: number) => {
    if (confirm('Вы уверены что хотите отменить запись?')) {
      try {
        await apiCancelBooking(id);
        await fetchBookings({ chat_id: user!.id });
        alert('Запись отменена');
      } catch (error: any) {
        const errorMsg = error.response?.data?.detail || 'Ошибка при отмене';
        alert(errorMsg);
      }
    }
  };

  const openReschedule = (booking: Booking) => {
    setRescheduleModal({
      open: true,
      booking,
      newDate: '',
      newTime: '',
      reason: '',
    });
  };

  const handleReschedule = async () => {
    if (!rescheduleModal.booking || !rescheduleModal.newDate || !rescheduleModal.newTime) {
      alert('Выберите дату и время');
      return;
    }

    try {
      await rescheduleBooking({
        booking_id: rescheduleModal.booking.id,
        new_date: rescheduleModal.newDate,
        new_time: rescheduleModal.newTime,
        reason: rescheduleModal.reason,
      });
      await fetchBookings({ chat_id: user!.id });
      setRescheduleModal({ open: false, booking: null, newDate: '', newTime: '', reason: '' });
      alert('Запись перенесена');
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Ошибка при переносе';
      alert(errorMsg);
    }
  };

  // Генерируем даты на 7 дней вперёд
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  });

  const TIME_SLOTS = [
    '09:00', '10:00', '11:00', '12:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  ];

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconChevronLeft size={24} />
        </button>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>Мои записи</h1>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <Button
          variant={filter === 'active' ? 'primary' : 'secondary'}
          onClick={() => setFilter('active')}
          style={{ flex: 1 }}
        >
          Активные
        </Button>
        <Button
          variant={filter === 'history' ? 'primary' : 'secondary'}
          onClick={() => setFilter('history')}
          style={{ flex: 1 }}
        >
          История
        </Button>
      </div>

      {filter === 'active' && (
        <>
          {activeBookings.length === 0 ? (
            <Card>
              <p className="text-center text-hint">У вас нет активных записей</p>
            </Card>
          ) : (
            activeBookings.map((booking) => (
              <Card key={booking.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3>{booking.service}</h3>
                    <p className="text-hint">
                      {booking.date} в {booking.time}
                    </p>
                    <p className="text-hint">Мастер: {booking.master}</p>
                  </div>
                  <Badge status={booking.status} />
                </div>
                
                {booking.comment && (
                  <p className="text-hint mt-2" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IconMessage size={16} /> {booking.comment}
                  </p>
                )}
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <Button
                    variant="secondary"
                    onClick={() => openReschedule(booking)}
                    style={{ flex: 1 }}
                  >
                    Перенести
                  </Button>
                  {['pending', 'confirmed'].includes(booking.status) && (
                    <Button
                      variant="danger"
                      onClick={() => handleCancel(booking.id)}
                      style={{ flex: 1 }}
                    >
                      Отменить
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </>
      )}

      {filter === 'history' && (
        <>
          {historyBookings.length === 0 ? (
            <Card>
              <p className="text-center text-hint">История пуста</p>
            </Card>
          ) : (
            historyBookings.map((booking) => (
              <Card key={booking.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3>{booking.service}</h3>
                    <p className="text-hint">
                      {booking.date} в {booking.time}
                    </p>
                    <p className="text-hint">Мастер: {booking.master}</p>
                  </div>
                  <Badge status={booking.status} />
                </div>
                
                {booking.actual_amount && (
                  <p className="mt-2">
                    <strong>Сумма: {booking.actual_amount.toLocaleString()} сом</strong>
                  </p>
                )}
              </Card>
            ))
          )}
        </>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal.open && rescheduleModal.booking && (
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
          <Card style={{ width: '90%', maxWidth: '400px' }}>
            <h3>Перенос записи</h3>
            <p className="text-hint" style={{ fontSize: '12px' }}>
              {rescheduleModal.booking.service} | {rescheduleModal.booking.master}
            </p>
            <p className="text-hint" style={{ fontSize: '12px' }}>
              Текущее время: {rescheduleModal.booking.date} в {rescheduleModal.booking.time}
            </p>

            <label className="mt-2" style={{ display: 'block', marginBottom: '8px' }}>
              Новая дата:
            </label>
            <select
              className="input"
              value={rescheduleModal.newDate}
              onChange={(e) => setRescheduleModal({ ...rescheduleModal, newDate: e.target.value })}
            >
              <option value="">Выберите дату</option>
              {dates.map((date) => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>

            <label className="mt-2" style={{ display: 'block', marginBottom: '8px' }}>
              Новое время:
            </label>
            <select
              className="input"
              value={rescheduleModal.newTime}
              onChange={(e) => setRescheduleModal({ ...rescheduleModal, newTime: e.target.value })}
            >
              <option value="">Выберите время</option>
              {TIME_SLOTS.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>

            <label className="mt-2" style={{ display: 'block', marginBottom: '8px' }}>
              Причина переноса:
            </label>
            <textarea
              className="input"
              placeholder="Необязательно"
              value={rescheduleModal.reason}
              onChange={(e) => setRescheduleModal({ ...rescheduleModal, reason: e.target.value })}
              rows={3}
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <Button fullWidth onClick={handleReschedule}>
                Перенести
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setRescheduleModal({ open: false, booking: null, newDate: '', newTime: '', reason: '' })}
              >
                Отмена
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
