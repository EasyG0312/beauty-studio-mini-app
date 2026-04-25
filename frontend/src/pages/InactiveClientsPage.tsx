import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { IconUser, IconSend, IconCheck, IconChevronLeft } from '../components/Icons';
import { haptic } from '../services/haptic';

interface Client {
  chat_id: number;
  name: string;
  phone: string;
  last_visit: string;
  visit_count: number;
  days_inactive: number;
}

export default function InactiveClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{sent?: number; failed?: number; total?: number} | null>(null);
  const [days, setDays] = useState(60);
  const [promoCode, setPromoCode] = useState('');
  const [useCustomMessage, setUseCustomMessage] = useState(false);

  useEffect(() => {
    loadInactiveClients();
  }, [days]);

  const loadInactiveClients = async () => {
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/clients/inactive?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Добавляем расчет дней неактивности
        const clientsWithDays = data.map((c: any) => ({
          ...c,
          days_inactive: c.last_visit ? calculateDaysInactive(c.last_visit) : days
        }));
        setClients(clientsWithDays);
        // Выбираем всех по умолчанию
        setSelectedClients(clientsWithDays.map((c: Client) => c.chat_id));
      }
    } catch (error) {
      console.error('Failed to load inactive clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysInactive = (lastVisit: string): number => {
    try {
      const date = new Date(lastVisit.split('.').reverse().join('-'));
      const now = new Date();
      return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  const toggleClient = (chatId: number) => {
    haptic.selection();
    setSelectedClients(prev => 
      prev.includes(chatId) 
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const selectAll = () => {
    haptic.selection();
    setSelectedClients(clients.map(c => c.chat_id));
  };

  const deselectAll = () => {
    haptic.selection();
    setSelectedClients([]);
  };

  const sendReactivation = async () => {
    if (selectedClients.length === 0) {
      alert('Выберите хотя бы одного клиента');
      return;
    }

    setSending(true);
    haptic.notification('success');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // Если выбрано мало клиентов — отправляем через bulk-message
      // Если много — используем reactivation endpoint
      const endpoint = selectedClients.length <= 10 
        ? `${API_URL}/api/clients/bulk-message`
        : `${API_URL}/api/clients/inactive/reactivation`;

      const body = selectedClients.length <= 10
        ? { client_ids: selectedClients, message: message || getDefaultMessage(), type: 'reactivation' }
        : { days, message: useCustomMessage ? message : '', promo_code: promoCode };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        haptic.notification('success');
      } else {
        throw new Error('Failed to send');
      }
    } catch (error) {
      console.error('Failed to send messages:', error);
      haptic.notification('error');
      alert('Ошибка отправки сообщений');
    } finally {
      setSending(false);
    }
  };

  const getDefaultMessage = () => {
    return `💕 {name}, мы скучаем по вам!

Вы не были у нас с {last_visit}.

У нас много нового:
✨ Новые услуги
🎁 Специальные предложения
👩‍🎨 Новые мастера

${promoCode ? `🎫 Промокод на скидку: ${promoCode}\n\n` : ''}Ждем вас снова! 💇‍♀️`;
  };

  if (loading) {
    return (
      <div className="page">
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }} />
          <div className="text-hint">Загрузка клиентов...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate('/clients')}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-gold)',
          }}
        >
          <IconChevronLeft size={24} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22 }}>
            😴 Забытые клиенты
          </h1>
          <div className="text-hint" style={{ fontSize: 13, marginTop: 4 }}>
            Реактивация клиентской базы
          </div>
        </div>
      </div>

      {/* Stats */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--brand-gold)' }}>
              {clients.length}
            </div>
            <div className="text-hint" style={{ fontSize: 13 }}>
              Неактивных клиентов
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 32, fontWeight: 700 }}>
              {selectedClients.length}
            </div>
            <div className="text-hint" style={{ fontSize: 13 }}>
              Выбрано для рассылки
            </div>
          </div>
        </div>
      </Card>

      {/* Filter */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>
          📊 Фильтр по неактивности
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[30, 60, 90, 180].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                background: days === d ? 'var(--brand-gold)' : 'var(--tg-theme-bg-color)',
                color: days === d ? 'white' : 'var(--tg-theme-text-color)',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: 13
              }}
            >
              {d} дней
            </button>
          ))}
        </div>
        <div className="text-hint" style={{ fontSize: 12 }}>
          Показаны клиенты, не посещавшие салон более {days} дней
        </div>
      </Card>

      {/* Selection Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button variant="secondary" onClick={selectAll} style={{ flex: 1 }}>
          Выбрать всех
        </Button>
        <Button variant="secondary" onClick={deselectAll} style={{ flex: 1 }}>
          Снять выбор
        </Button>
      </div>

      {/* Clients List */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>
          👥 Список клиентов
        </div>
        
        {clients.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 16, marginBottom: 8 }}>Нет неактивных клиентов!</div>
              <div className="text-hint" style={{ fontSize: 13 }}>
                Все клиенты были в салоне недавно
              </div>
            </div>
          </Card>
        ) : (
          clients.map((client) => (
            <Card 
              key={client.chat_id} 
              style={{ 
                marginBottom: 8, 
                padding: 12,
                border: selectedClients.includes(client.chat_id) 
                  ? '2px solid var(--brand-gold)' 
                  : '1px solid var(--gray-100)',
                background: selectedClients.includes(client.chat_id) 
                  ? 'var(--brand-gold-subtle)' 
                  : 'var(--tg-theme-bg-color)',
                cursor: 'pointer'
              }}
              onClick={() => toggleClient(client.chat_id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: selectedClients.includes(client.chat_id) 
                    ? 'var(--brand-gold)' 
                    : 'var(--gray-200)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: selectedClients.includes(client.chat_id) ? 'white' : 'var(--gray-500)',
                  fontWeight: 600
                }}>
                  {selectedClients.includes(client.chat_id) ? <IconCheck size={20} /> : <IconUser size={20} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{client.name || 'Неизвестно'}</div>
                  <div className="text-hint" style={{ fontSize: 12, marginTop: 2 }}>
                    {client.phone}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: '#fff3cd',
                      color: '#856404',
                      fontSize: 11,
                      fontWeight: 500
                    }}>
                      {client.days_inactive} дней без визита
                    </span>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: '#e9ecef',
                      color: '#495057',
                      fontSize: 11,
                      fontWeight: 500
                    }}>
                      {client.visit_count} визитов всего
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Message Composer */}
      {clients.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>
            💬 Сообщение реактивации
          </div>

          {/* Promo Code */}
          <div style={{ marginBottom: 16 }}>
            <label className="text-hint" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
              🎫 Промокод (необязательно):
            </label>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="WELCOME2024"
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 10,
                border: '1px solid var(--gray-200)',
                background: 'var(--tg-theme-bg-color)',
                color: 'var(--tg-theme-text-color)',
                fontSize: 14
              }}
            />
          </div>

          {/* Toggle Custom Message */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontSize: 14
            }}>
              <input
                type="checkbox"
                checked={useCustomMessage}
                onChange={(e) => setUseCustomMessage(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span>Использовать своё сообщение</span>
            </label>
          </div>

          {/* Custom Message Textarea */}
          {useCustomMessage && (
            <div>
              <label className="text-hint" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                Текст сообщения:
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={getDefaultMessage()}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid var(--gray-200)',
                  background: 'var(--tg-theme-bg-color)',
                  color: 'var(--tg-theme-text-color)',
                  fontSize: 14,
                  resize: 'vertical',
                  minHeight: 120
                }}
              />
              <div className="text-hint" style={{ fontSize: 11, marginTop: 6 }}>
                Переменные: {'{name}'} — имя клиента, {'{last_visit}'} — дата последнего визита
              </div>
            </div>
          )}

          {!useCustomMessage && (
            <div style={{ 
              padding: 12, 
              background: 'var(--gray-50)', 
              borderRadius: 10,
              fontSize: 14,
              whiteSpace: 'pre-wrap'
            }}>
              <div className="text-hint" style={{ fontSize: 11, marginBottom: 8 }}>
                Будет отправлено стандартное сообщение:
              </div>
              {getDefaultMessage()}
            </div>
          )}
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card style={{ marginBottom: 16, background: 'var(--brand-gold-subtle)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>✅ Рассылка завершена!</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--brand-gold)' }}>
              {result.sent} / {result.total}
            </div>
            <div className="text-hint" style={{ fontSize: 13 }}>
              Успешно отправлено
            </div>
            {result.failed && result.failed > 0 && (
              <div style={{ fontSize: 13, color: 'var(--color-danger)', marginTop: 8 }}>
                Не удалось отправить: {result.failed}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Send Button */}
      {clients.length > 0 && (
        <Button 
          fullWidth 
          onClick={sendReactivation} 
          disabled={sending || selectedClients.length === 0}
          leftIcon={<IconSend size={18} />}
        >
          {sending 
            ? 'Отправка...' 
            : `📤 Отправить ${selectedClients.length} клиентам`
          }
        </Button>
      )}
    </div>
  );
}
