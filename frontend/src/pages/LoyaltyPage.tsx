import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getLoyaltyStatus } from '../services/api';
import type { LoyaltyStatus } from '../types';
import Card from '../components/Card';

export default function LoyaltyPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loyalty, setLoyalty] = useState<LoyaltyStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadLoyaltyStatus();
    }
  }, [user]);

  const loadLoyaltyStatus = async () => {
    setLoading(true);
    try {
      const data = await getLoyaltyStatus(user!.id);
      setLoyalty(data);
    } catch (error) {
      console.error('Failed to load loyalty status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (!loyalty) {
    return (
      <div className="page">
        <Card>
          <p className="text-center text-hint">Ошибка загрузки данных</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ←
        </button>
        <h1 style={{ margin: 0 }}>Программа лояльности</h1>
      </div>

      {/* Status Card */}
      <Card>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          {loyalty.is_loyal ? (
            <>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>👑</div>
              <h2 style={{ color: '#FFD700' }}>Постоянный клиент</h2>
              <p className="text-hint">Ваша скидка: {loyalty.discount_percent}%</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>💎</div>
              <h2>Статус лояльности</h2>
              <p className="text-hint">
                До постоянной скидки: {loyalty.next_reward_at} визит(а)
              </p>
            </>
          )}
        </div>

        {/* Progress Bar */}
        <div style={{
          background: 'var(--tg-theme-secondary-bg-color)',
          borderRadius: '8px',
          height: '12px',
          overflow: 'hidden',
          marginBottom: '16px',
        }}>
          <div style={{
            background: loyalty.is_loyal ? '#FFD700' : 'var(--tg-theme-button-color)',
            height: '100%',
            width: `${(loyalty.visit_count % 5) * 20}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          marginTop: '16px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{loyalty.visit_count}</div>
            <div className="text-hint" style={{ fontSize: '12px' }}>Визитов</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{loyalty.total_saved}</div>
            <div className="text-hint" style={{ fontSize: '12px' }}>Сэкономлено сом</div>
          </div>
        </div>
      </Card>

      {/* Info Cards */}
      <Card className="mt-3">
        <h3>Как это работает?</h3>
        <ol style={{ lineHeight: '1.8', marginTop: '12px' }}>
          <li>Запишитесь на любую услугу</li>
          <li>Посетите салон 5 раз</li>
          <li>Получите постоянную скидку 10%</li>
          <li>Экономьте на каждом визите!</li>
        </ol>
      </Card>

      <Card className="mt-3">
        <h3>Преимущества</h3>
        <ul style={{ lineHeight: '1.8', marginTop: '12px' }}>
          <li>✅ Скидка 10% на все услуги</li>
          <li>✅ Приоритетная запись</li>
          <li>✅ Специальные предложения</li>
          <li>✅ Подарки на день рождения</li>
        </ul>
      </Card>

      {!loyalty.is_loyal && (
        <Card className="mt-3" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎯</div>
            <h3 style={{ color: 'white' }}>
              Осталось {loyalty.next_reward_at} визит(а)
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.9)' }}>
              до статуса постоянного клиента!
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
