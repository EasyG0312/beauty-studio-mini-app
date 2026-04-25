import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { IconBell, IconClock, IconMessage, IconCheck } from '../components/Icons';
import { haptic } from '../services/haptic';

interface ReminderSettings {
  id: number;
  reminder_24h_enabled: boolean;
  reminder_24h_hours: number;
  reminder_1h_enabled: boolean;
  reminder_1h_hours: number;
  reminder_custom_enabled: boolean;
  reminder_custom_hours: number;
  reminder_custom_message: string;
  message_template_24h: string;
  message_template_1h: string;
  message_template_custom: string;
  updated_by?: number;
  updated_at?: string;
}

export default function ReminderSettingsPage() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/reminder-settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    haptic.selection();
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/reminder-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        haptic.notification('success');
        setMessage('✅ Настройки сохранены!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      haptic.notification('error');
      setMessage('❌ Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ReminderSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  if (loading) {
    return (
      <div className="page">
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }} />
          <div className="text-hint">Загрузка настроек...</div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="page">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
          <div style={{ fontSize: 18, marginBottom: 8 }}>Настройки не найдены</div>
          <Button onClick={loadSettings}>Повторить</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: 'var(--brand-gold-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}>
          <IconBell size={24} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 24 }}>
            Напоминания
          </h1>
          <div className="text-hint" style={{ fontSize: 13, marginTop: 4 }}>
            Настройка времени и шаблонов
          </div>
        </div>
      </div>

      {message && (
        <Card style={{ marginBottom: 16, background: 'var(--brand-gold-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--brand-gold)' }}>
            <IconCheck size={18} />
            <span style={{ fontWeight: 500 }}>{message}</span>
          </div>
        </Card>
      )}

      {/* 24h Reminder */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--brand-gold-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-gold)'
          }}>
            <IconClock size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Напоминание за день</div>
            <div className="text-hint" style={{ fontSize: 13 }}>
              Отправляется за указанное количество часов
            </div>
          </div>
          <label style={{
            width: 50,
            height: 28,
            borderRadius: 14,
            background: settings.reminder_24h_enabled ? 'var(--brand-gold)' : 'var(--gray-300)',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 200ms ease'
          }}>
            <input
              type="checkbox"
              checked={settings.reminder_24h_enabled}
              onChange={(e) => updateField('reminder_24h_enabled', e.target.checked)}
              style={{ display: 'none' }}
            />
            <div style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              background: 'white',
              position: 'absolute',
              top: 3,
              left: settings.reminder_24h_enabled ? 25 : 3,
              transition: 'all 200ms ease'
            }} />
          </label>
        </div>

        {settings.reminder_24h_enabled && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label className="text-hint" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                За сколько часов отправлять:
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[12, 24, 48].map((hours) => (
                  <button
                    key={hours}
                    onClick={() => updateField('reminder_24h_hours', hours)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 10,
                      border: 'none',
                      background: settings.reminder_24h_hours === hours ? 'var(--brand-gold)' : 'var(--tg-theme-bg-color)',
                      color: settings.reminder_24h_hours === hours ? 'white' : 'var(--tg-theme-text-color)',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 200ms ease'
                    }}
                  >
                    {hours} ч
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-hint" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                Шаблон сообщения:
              </label>
              <textarea
                value={settings.message_template_24h}
                onChange={(e) => updateField('message_template_24h', e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid var(--gray-200)',
                  background: 'var(--tg-theme-bg-color)',
                  color: 'var(--tg-theme-text-color)',
                  fontSize: 14,
                  resize: 'vertical',
                  minHeight: 80
                }}
                placeholder="📅 Напоминаем: завтра в {time}..."
              />
              <div className="text-hint" style={{ fontSize: 11, marginTop: 6 }}>
                Переменные: {'{time}'} — время, {'{master}'} — мастер, {'{service}'} — услуга
              </div>
            </div>
          </>
        )}
      </Card>

      {/* 1h Reminder */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--brand-gold-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-gold)'
          }}>
            <IconClock size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Напоминание за час</div>
            <div className="text-hint" style={{ fontSize: 13 }}>
              Быстрое напоминание перед визитом
            </div>
          </div>
          <label style={{
            width: 50,
            height: 28,
            borderRadius: 14,
            background: settings.reminder_1h_enabled ? 'var(--brand-gold)' : 'var(--gray-300)',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 200ms ease'
          }}>
            <input
              type="checkbox"
              checked={settings.reminder_1h_enabled}
              onChange={(e) => updateField('reminder_1h_enabled', e.target.checked)}
              style={{ display: 'none' }}
            />
            <div style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              background: 'white',
              position: 'absolute',
              top: 3,
              left: settings.reminder_1h_enabled ? 25 : 3,
              transition: 'all 200ms ease'
            }} />
          </label>
        </div>

        {settings.reminder_1h_enabled && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label className="text-hint" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                За сколько часов отправлять:
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3].map((hours) => (
                  <button
                    key={hours}
                    onClick={() => updateField('reminder_1h_hours', hours)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 10,
                      border: 'none',
                      background: settings.reminder_1h_hours === hours ? 'var(--brand-gold)' : 'var(--tg-theme-bg-color)',
                      color: settings.reminder_1h_hours === hours ? 'white' : 'var(--tg-theme-text-color)',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 200ms ease'
                    }}
                  >
                    {hours} ч
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-hint" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                Шаблон сообщения:
              </label>
              <textarea
                value={settings.message_template_1h}
                onChange={(e) => updateField('message_template_1h', e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid var(--gray-200)',
                  background: 'var(--tg-theme-bg-color)',
                  color: 'var(--tg-theme-text-color)',
                  fontSize: 14,
                  resize: 'vertical',
                  minHeight: 60
                }}
                placeholder="⏰ Через час ({time}) вас ожидает..."
              />
              <div className="text-hint" style={{ fontSize: 11, marginTop: 6 }}>
                Переменные: {'{time}'} — время, {'{master}'} — мастер
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Custom Reminder */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--brand-gold-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-gold)'
          }}>
            <IconMessage size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Кастомное напоминание</div>
            <div className="text-hint" style={{ fontSize: 13 }}>
              Дополнительное сообщение
            </div>
          </div>
          <label style={{
            width: 50,
            height: 28,
            borderRadius: 14,
            background: settings.reminder_custom_enabled ? 'var(--brand-gold)' : 'var(--gray-300)',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 200ms ease'
          }}>
            <input
              type="checkbox"
              checked={settings.reminder_custom_enabled}
              onChange={(e) => updateField('reminder_custom_enabled', e.target.checked)}
              style={{ display: 'none' }}
            />
            <div style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              background: 'white',
              position: 'absolute',
              top: 3,
              left: settings.reminder_custom_enabled ? 25 : 3,
              transition: 'all 200ms ease'
            }} />
          </label>
        </div>

        {settings.reminder_custom_enabled && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label className="text-hint" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                За сколько часов отправлять:
              </label>
              <input
                type="number"
                value={settings.reminder_custom_hours}
                onChange={(e) => updateField('reminder_custom_hours', parseInt(e.target.value) || 0)}
                style={{
                  width: 100,
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid var(--gray-200)',
                  background: 'var(--tg-theme-bg-color)',
                  color: 'var(--tg-theme-text-color)',
                  fontSize: 14
                }}
              />
            </div>

            <div>
              <label className="text-hint" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                Шаблон сообщения:
              </label>
              <textarea
                value={settings.message_template_custom}
                onChange={(e) => updateField('message_template_custom', e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid var(--gray-200)',
                  background: 'var(--tg-theme-bg-color)',
                  color: 'var(--tg-theme-text-color)',
                  fontSize: 14,
                  resize: 'vertical',
                  minHeight: 60
                }}
                placeholder="💅 Не забудьте про вашу запись..."
              />
              <div className="text-hint" style={{ fontSize: 11, marginTop: 6 }}>
                Переменные: {'{date}'} — дата, {'{time}'} — время
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Save Button */}
      <Button 
        fullWidth 
        onClick={saveSettings} 
        disabled={saving}
        style={{ marginBottom: 12 }}
      >
        {saving ? 'Сохранение...' : '💾 Сохранить настройки'}
      </Button>

      {settings.updated_at && (
        <div className="text-hint" style={{ textAlign: 'center', fontSize: 12 }}>
          Последнее обновление: {settings.updated_at}
        </div>
      )}
    </div>
  );
}
