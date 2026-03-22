import { useState, useEffect } from 'react';
import { getPendingNotifications, sendNotification } from '../services/api';
import type { Notification } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

const NOTIFICATION_TYPES: Record<string, string> = {
  reminder_3d: '📅 Напоминание (3 дня)',
  reminder_1d: '📅 Напоминание (1 день)',
  reminder_1h: '⏰ Напоминание (1 час)',
  confirmation: '✅ Подтверждение',
  waitlist: '📋 Лист ожидания',
  loyalty: '👑 Лояльность',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Для демо загружаем только pending (в реальности нужен endpoint для истории)
      const data = await getPendingNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (id: number) => {
    try {
      await sendNotification(id);
      await loadNotifications();
      alert('Уведомление отправлено');
    } catch (error) {
      alert('Ошибка при отправке');
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'pending') return !n.sent;
    if (filter === 'sent') return n.sent;
    return true;
  });

  const formatNotificationType = (type: string) => {
    return NOTIFICATION_TYPES[type] || type;
  };

  return (
    <div className="page">
      <h1>Уведомления</h1>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <Button
          variant={filter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setFilter('all')}
          style={{ flex: 1 }}
        >
          Все
        </Button>
        <Button
          variant={filter === 'pending' ? 'primary' : 'secondary'}
          onClick={() => setFilter('pending')}
          style={{ flex: 1 }}
        >
          Ожидают
        </Button>
        <Button
          variant={filter === 'sent' ? 'primary' : 'secondary'}
          onClick={() => setFilter('sent')}
          style={{ flex: 1 }}
        >
          Отправленные
        </Button>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : filteredNotifications.length === 0 ? (
        <Card>
          <p className="text-center text-hint">
            {filter === 'pending' ? 'Нет ожидающих уведомлений' : 'Нет уведомлений'}
          </p>
        </Card>
      ) : (
        filteredNotifications.map((notification) => (
          <Card key={notification.id} className="mb-2">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                  {formatNotificationType(notification.notification_type)}
                </div>
                <p style={{ margin: '8px 0', whiteSpace: 'pre-line' }}>
                  {notification.message}
                </p>
                <div style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>
                  <div>🕐 Отправка: {notification.send_at}</div>
                  {notification.sent && notification.sent_at && (
                    <div>✅ Отправлено: {notification.sent_at}</div>
                  )}
                  {notification.booking_id && (
                    <div>📅 Запись: #{notification.booking_id}</div>
                  )}
                </div>
              </div>

              {!notification.sent && (
                <Button
                  onClick={() => handleSend(notification.id)}
                  style={{ marginLeft: '8px' }}
                >
                  Отправить
                </Button>
              )}
            </div>
          </Card>
        ))
      )}

      {/* Info */}
      <Card className="mt-3">
        <h3>ℹ️ Как это работает</h3>
        <ul style={{ lineHeight: '1.8', marginTop: '8px', fontSize: '14px' }}>
          <li>Напоминание за 3 дня — отправляется за 72 часа до записи</li>
          <li>Напоминание за 1 день — отправляется за 24 часа до записи</li>
          <li>Напоминание за 1 час — отправляется за 60 минут до записи</li>
          <li>Уведомления отправляются автоматически через Telegram</li>
        </ul>
      </Card>
    </div>
  );
}
