import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { updateClient, getLoyaltyStatus } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import {
  IconUser, IconCalendar,
  IconCrown, IconStar, IconChevronRight, IconSettings,
  IconList, IconMessage,
} from '../components/Icons';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.telegramUser?.first_name || '');
  const [phone, setPhone] = useState('');
  const [loyaltyStatus, setLoyaltyStatus] = useState<{
    is_loyal: boolean;
    discount_percent: number;
    next_reward_at: number;
    total_saved: number;
  } | null>(null);

  useEffect(() => {
    // Загрузка статуса лояльности
    if (user?.id) {
      getLoyaltyStatus(user.id)
        .then(loyalty => {
          setLoyaltyStatus(loyalty);
        })
        .catch(() => {});
    }
  }, [user]);

  const handleSave = async () => {
    // Валидация телефона
    const phonePattern = /^\+996\d{9}$/;
    let normalizedPhone = phone.replace(/\s+/g, '');
    if (normalizedPhone && !phonePattern.test(normalizedPhone)) {
      if (normalizedPhone.match(/^\d{9}$/)) {
        normalizedPhone = '+996' + normalizedPhone;
        setPhone(normalizedPhone);
      } else {
        alert('Введите корректный номер телефона в формате +996XXXXXXXXX');
        return;
      }
    }

    try {
      await updateClient(user!.id, {
        name: name.trim(),
        phone: normalizedPhone,
      });
      setEditing(false);
      alert('Профиль обновлен');
    } catch (error) {
      alert('Ошибка при сохранении профиля');
    }
  };

  const menuItems = [
    { icon: IconCalendar, label: 'Мои записи', action: () => navigate('/my-bookings') },
    { icon: IconList, label: 'История посещений', action: () => navigate('/my-bookings') },
    { icon: IconCrown, label: 'Программа лояльности', action: () => navigate('/loyalty') },
    { icon: IconMessage, label: 'Чат с менеджером', action: () => navigate('/chat') },
    { icon: IconStar, label: 'Мои отзывы', action: () => navigate('/reviews') },
    { icon: IconSettings, label: 'Настройки', action: () => {} },
  ];

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ 
          fontFamily: 'var(--font-serif)', 
          fontSize: 'var(--font-size-3xl)',
          marginBottom: 4,
        }}>
          Профиль
        </h1>
        <p className="text-hint" style={{ fontSize: 13 }}>
          Управление данными и настройками
        </p>
      </div>

      {/* Profile Card */}
      <Card style={{ 
        padding: 0, 
        overflow: 'hidden',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        marginBottom: 20,
      }}>
        {/* Avatar */}
        <div style={{
          background: 'var(--brand-gold-gradient)',
          padding: '28px 24px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid rgba(255,255,255,0.3)',
          }}>
            <IconUser size={32} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            {editing ? (
              <div>
                <input
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ваше имя"
                  style={{ 
                    background: 'rgba(255,255,255,0.15)', 
                    border: '1px solid rgba(255,255,255,0.3)', 
                    color: 'white',
                    marginBottom: 8,
                  }}
                />
                <input
                  type="tel"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+996 XXX XXX XXX"
                  style={{ 
                    background: 'rgba(255,255,255,0.15)', 
                    border: '1px solid rgba(255,255,255,0.3)', 
                    color: 'white',
                  }}
                />
              </div>
            ) : (
              <>
                <div style={{ color: 'white', fontWeight: 600, fontSize: 18, marginBottom: 4 }}>
                  {name || 'Пользователь'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                  {phone || `ID: ${user?.id || '—'}`}
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 12,
              padding: '8px 14px',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {editing ? 'Сохранить' : 'Изм.'}
          </button>
        </div>

        {/* Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          padding: '16px 20px',
          gap: 12,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-gold)' }}>
              {loyaltyStatus ? `${loyaltyStatus.discount_percent}%` : '0%'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
              Скидка
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-gold)' }}>
              {loyaltyStatus?.total_saved || 0}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
              Сэкономлено
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-gold)' }}>
              {loyaltyStatus ? loyaltyStatus.next_reward_at : 5}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
              До следующей скидки
            </div>
          </div>
        </div>

        {/* Loyalty Progress Bar */}
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ 
            height: 6, 
            borderRadius: 3, 
            background: 'var(--gray-200)',
            overflow: 'hidden',
          }}>
            <div style={{ 
              height: '100%', 
              width: `${loyaltyStatus ? ((5 - loyaltyStatus.next_reward_at) / 5) * 100 : 0}%`,
              background: 'var(--brand-gold-gradient)',
              borderRadius: 3,
              transition: 'width 500ms ease',
            }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 4, textAlign: 'center' }}>
            {loyaltyStatus?.is_loyal ? '🎉 У вас есть скидка!' : `Ещё ${loyaltyStatus?.next_reward_at || 5} визитов до скидки`}
          </div>
        </div>
      </Card>

      {/* Menu Items */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {menuItems.map((item, index) => (
          <div
            key={item.label}
            onClick={item.action}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '16px 20px',
              borderBottom: index < menuItems.length - 1 ? '1px solid var(--gray-100)' : 'none',
              cursor: item.action !== undefined ? 'pointer' : 'default',
              transition: 'background 200ms ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'var(--brand-gold-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-gold)',
              flexShrink: 0,
            }}>
              <item.icon size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 15 }}>{item.label}</div>
            </div>
            <IconChevronRight size={18} color="var(--gray-400)" />
          </div>
        ))}
      </Card>

      {/* Logout */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Button
          variant="ghost"
          onClick={() => {
            useAuthStore.getState().logout();
            navigate('/');
          }}
          style={{ color: 'var(--color-danger)' }}
        >
          Выйти из аккаунта
        </Button>
      </div>
    </div>
  );
}
