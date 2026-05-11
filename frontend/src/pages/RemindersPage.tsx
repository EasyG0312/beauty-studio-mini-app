/**
 * Reminders Management Page
 * 
 * Страница управления напоминаниями для менеджеров и владельцев.
 * Позволяет создавать, редактировать и отслеживать напоминания.
 * 
 * @version 2.1.5
 */

import { useState, useEffect } from 'react';
import { 
  getReminders, 
  getReminderTemplates, 
  createReminderTemplate,
  sendRemindersManual,
  getReminderStats
} from '../services/api';

interface Reminder {
  id: number;
  booking_id: number;
  client_id: number;
  reminder_type: string;
  channel: string;
  scheduled_at: string;
  sent_at?: string;
  is_sent: boolean;
  message_text: string;
  created_at: string;
}

interface ReminderTemplate {
  id: number;
  name: string;
  reminder_type: string;
  channel: string;
  template_text: string;
  variables?: string;
  is_active: boolean;
  created_at: string;
}

interface ReminderStats {
  total_reminders: number;
  sent_reminders: number;
  success_rate: number;
  recent_sent: number;
  recent_failed: number;
  period_days: number;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    reminder_type: 'before_24h',
    channel: 'telegram',
    template_text: '',
    variables: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [remindersData, templatesData, statsData] = await Promise.all([
        getReminders(),
        getReminderTemplates(),
        getReminderStats()
      ]);
      
      setReminders(remindersData);
      setTemplates(templatesData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleSendManual = async () => {
    try {
      const result = await sendRemindersManual();
      alert(`Отправлено ${result.sent_count} напоминаний`);
      loadData(); // Обновляем данные
    } catch (err: any) {
      alert('Ошибка отправки: ' + (err.response?.data?.detail || 'Неизвестная ошибка'));
    }
  };

  const handleCreateTemplate = async () => {
    try {
      await createReminderTemplate(newTemplate);
      alert('Шаблон создан успешно!');
      setShowTemplateModal(false);
      setNewTemplate({
        name: '',
        reminder_type: 'before_24h',
        channel: 'telegram',
        template_text: '',
        variables: ''
      });
      loadData();
    } catch (err: any) {
      alert('Ошибка создания шаблона: ' + (err.response?.data?.detail || 'Неизвестная ошибка'));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getStatusColor = (reminder: Reminder) => {
    if (reminder.is_sent) return '#4CAF50';
    if (new Date(reminder.scheduled_at) < new Date()) return '#FF9800';
    return '#2196F3';
  };

  const getStatusText = (reminder: Reminder) => {
    if (reminder.is_sent) return 'Отправлено';
    if (new Date(reminder.scheduled_at) < new Date()) return 'Просрочено';
    return 'Ожидает';
  };

  if (loading) {
    return (
      <div className="page">
        <h2>Управление напоминаниями</h2>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          Загрузка...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <h2>Управление напоминаниями</h2>
        <div style={{ textAlign: 'center', padding: '40px', color: '#f44336' }}>
          {error}
          <br />
          <button onClick={loadData} style={{ marginTop: '10px' }}>
            🔄 Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>📅 Управление напоминаниями</h2>
        <div>
          <button 
            onClick={() => setShowTemplateModal(true)}
            style={{ marginRight: '10px' }}
          >
            ➕ Шаблон
          </button>
          <button onClick={handleSendManual}>
            📤 Отправить сейчас
          </button>
        </div>
      </div>

      {/* Статистика */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px', 
          marginBottom: '30px' 
        }}>
          <div style={{ 
            background: 'var(--tg-theme-secondary-bg-color)', 
            padding: '15px', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.total_reminders}</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Всего напоминаний</div>
          </div>
          <div style={{ 
            background: 'var(--tg-theme-secondary-bg-color)', 
            padding: '15px', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
              {stats.sent_reminders}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Отправлено</div>
          </div>
          <div style={{ 
            background: 'var(--tg-theme-secondary-bg-color)', 
            padding: '15px', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {stats.success_rate}%
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Успешность</div>
          </div>
          <div style={{ 
            background: 'var(--tg-theme-secondary-bg-color)', 
            padding: '15px', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800' }}>
              {stats.recent_failed}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Ошибок за {stats.period_days} дней</div>
          </div>
        </div>
      )}

      {/* Список напоминаний */}
      <div style={{ background: 'var(--tg-theme-secondary-bg-color)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ 
          background: 'var(--tg-theme-header-bg-color)', 
          padding: '15px', 
          fontWeight: 'bold',
          borderBottom: '1px solid var(--tg-theme-section-separator-color)'
        }}>
          Последние напоминания
        </div>
        
        {reminders.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', opacity: 0.7 }}>
            Напоминаний пока нет
          </div>
        ) : (
          <div>
            {reminders.slice(0, 10).map((reminder) => (
              <div 
                key={reminder.id}
                style={{ 
                  padding: '15px',
                  borderBottom: '1px solid var(--tg-theme-section-separator-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {reminder.reminder_type.replace('_', ' ').toUpperCase()}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '5px' }}>
                    Запись #{reminder.booking_id} • {reminder.channel}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.5 }}>
                    Запланировано: {formatDate(reminder.scheduled_at)}
                  </div>
                  {reminder.sent_at && (
                    <div style={{ fontSize: '11px', opacity: 0.5 }}>
                      Отправлено: {formatDate(reminder.sent_at)}
                    </div>
                  )}
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div 
                    style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background: getStatusColor(reminder),
                      color: 'white',
                      marginBottom: '5px'
                    }}
                  >
                    {getStatusText(reminder)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно создания шаблона */}
      {showTemplateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--tg-theme-bg-color)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '20px' }}>Создать шаблон</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
                Название шаблона
              </label>
              <input
                type="text"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--tg-theme-section-separator-color)',
                  borderRadius: '6px',
                  background: 'var(--tg-theme-secondary-bg-color)',
                  color: 'var(--tg-theme-text-color)'
                }}
                placeholder="Например: Напоминание за 24 часа"
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
                Тип напоминания
              </label>
              <select
                value={newTemplate.reminder_type}
                onChange={(e) => setNewTemplate({...newTemplate, reminder_type: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--tg-theme-section-separator-color)',
                  borderRadius: '6px',
                  background: 'var(--tg-theme-secondary-bg-color)',
                  color: 'var(--tg-theme-text-color)'
                }}
              >
                <option value="before_24h">За 24 часа</option>
                <option value="before_2h">За 2 часа</option>
                <option value="birthday">День рождения</option>
                <option value="loyalty">Лояльность</option>
                <option value="promotion">Акция</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
                Текст шаблона
              </label>
              <textarea
                value={newTemplate.template_text}
                onChange={(e) => setNewTemplate({...newTemplate, template_text: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--tg-theme-section-separator-color)',
                  borderRadius: '6px',
                  background: 'var(--tg-theme-secondary-bg-color)',
                  color: 'var(--tg-theme-text-color)',
                  minHeight: '100px',
                  resize: 'vertical'
                }}
                placeholder="Здравствуйте, {client_name}! Напоминаем о вашей записи {service} к мастеру {master} на {date} в {time}."
              />
              <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '5px' }}>
                Доступные переменные: {'{client_name}'}, {'{service}'}, {'{master}'}, {'{date}'}, {'{time}'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={handleCreateTemplate}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--tg-theme-button-color)',
                  color: 'var(--tg-theme-button-text-color)',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold'
                }}
              >
                Создать
              </button>
              <button
                onClick={() => setShowTemplateModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--tg-theme-secondary-bg-color)',
                  color: 'var(--tg-theme-text-color)',
                  border: '1px solid var(--tg-theme-section-separator-color)',
                  borderRadius: '6px'
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
