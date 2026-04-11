import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getChatHistory, sendChatMessage, getClients } from '../services/api';
import type { ChatMessage, Client } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import { IconChevronLeft, IconSend, IconMessage } from '../components/Icons';

export default function ChatPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isManager = user?.role === 'manager' || user?.role === 'owner';

  useEffect(() => {
    if (isManager) {
      loadClients();
    } else {
      // Клиент видит чат со своим chat_id
      setSelectedChatId(user?.id || null);
    }
  }, [user, isManager]);

  useEffect(() => {
    if (selectedChatId) {
      loadMessages();
    }
  }, [selectedChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadClients = async () => {
    try {
      const data = await getClients();
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const loadMessages = async () => {
    if (!selectedChatId) return;
    setLoading(true);
    try {
      const data = await getChatHistory(selectedChatId, 100);
      setMessages(data.reverse());
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedChatId) return;

    try {
      await sendChatMessage(selectedChatId, newMessage.trim(), !isManager);
      setNewMessage('');
      loadMessages();
    } catch (error) {
      alert('Ошибка при отправке');
    }
  };

  const formatTime = (createdAt: string) => {
    try {
      const parts = createdAt.split(' ');
      return parts[1] || createdAt;
    } catch {
      return createdAt;
    }
  };

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
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
        <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>Чат с {isManager ? 'клиентом' : 'менеджером'}</h1>
      </div>

      {isManager && (
        <Card className="mb-2">
          <label style={{ display: 'block', marginBottom: '8px' }}>
            Выберите клиента:
          </label>
          <select
            className="input"
            value={selectedChatId || ''}
            onChange={(e) => setSelectedChatId(parseInt(e.target.value) || null)}
          >
            <option value="">-- Выберите --</option>
            {clients.map((client) => (
              <option key={client.chat_id} value={client.chat_id}>
                {client.name} ({client.phone})
              </option>
            ))}
          </select>
        </Card>
      )}

      {!selectedChatId ? (
        <Card>
          <p className="text-center text-hint">
            {isManager ? 'Выберите клиента для чата' : 'Загрузка чата...'}
          </p>
        </Card>
      ) : (
        <>
          <Card style={{ flex: 1, overflowY: 'auto', marginBottom: '12px' }}>
            {loading ? (
              <div className="loading">Загрузка...</div>
            ) : messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: 'var(--text-hint)' }}>
                <IconMessage size={48} />
                <p className="text-center text-hint" style={{ marginTop: '12px' }}>История пуста</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: msg.is_from_client ? 'flex-start' : 'flex-end',
                    marginBottom: '8px',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '70%',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      background: msg.is_from_client
                        ? 'var(--tg-theme-secondary-bg-color)'
                        : 'var(--tg-theme-button-color)',
                      color: msg.is_from_client
                        ? 'var(--tg-theme-text-color)'
                        : 'var(--tg-theme-button-text-color)',
                    }}
                  >
                    <p style={{ margin: 0, wordBreak: 'break-word' }}>{msg.message}</p>
                    <p
                      style={{
                        margin: '4px 0 0 0',
                        fontSize: '10px',
                        opacity: 0.7,
                        textAlign: 'right',
                      }}
                    >
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </Card>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="input"
              placeholder="Введите сообщение..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              style={{ flex: 1 }}
            />
            <Button onClick={handleSend} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px' }}>
              <IconSend size={18} />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
