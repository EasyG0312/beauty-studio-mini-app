import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getWaitlist, removeFromWaitlist, addToWaitlist } from '../services/api';
import type { Waitlist } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

const MASTERS = [
  { id: '1', name: 'Айгуль' },
  { id: '2', name: 'Диана' },
  { id: '3', name: 'Любой мастер' },
  { id: '4', name: 'Айгерим' },
  { id: '5', name: 'Эльвира' },
];

const SERVICES = ['Стрижка', 'Маникюр', 'Массаж лица', 'Макияж', 'Окрашивание'];

export default function WaitlistPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [waitlist, setWaitlist] = useState<Waitlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: '',
    time: '',
    master: '',
    service: '',
  });

  useEffect(() => {
    loadWaitlist();
  }, []);

  const loadWaitlist = async () => {
    setLoading(true);
    try {
      const data = await getWaitlist();
      setWaitlist(data);
    } catch (error) {
      console.error('Failed to load waitlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: number) => {
    if (confirm('Удалить из листа ожидания?')) {
      try {
        await removeFromWaitlist(id);
        loadWaitlist();
      } catch (error) {
        alert('Ошибка при удалении');
      }
    }
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.phone || !formData.date || !formData.time || !formData.master) {
      alert('Заполните все обязательные поля');
      return;
    }

    try {
      await addToWaitlist({
        chat_id: user?.id || 0,
        name: formData.name,
        phone: formData.phone,
        date: formData.date,
        time: formData.time,
        master: formData.master,
        service: formData.service,
      });
      alert('Вы добавлены в лист ожидания!');
      setShowAddForm(false);
      loadWaitlist();
    } catch (error) {
      alert('Ошибка: возможно, вы уже в списке');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          <h1 style={{ margin: 0 }}>Лист ожидания</h1>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Закрыть' : '+ Встать в очередь'}
        </Button>
      </div>

      <Card className="mt-3">
        <p className="text-hint">
          💡 Встаньте в лист ожидания на удобное время. Если место освободится, мы вам сообщим!
        </p>
      </Card>

      {showAddForm && (
        <Card className="mt-3">
          <h3>Добавить в лист ожидания</h3>

          <input
            type="text"
            className="input mt-2"
            placeholder="Ваше имя *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <input
            type="tel"
            className="input"
            placeholder="Телефон *"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <label className="mt-2" style={{ display: 'block', marginBottom: '8px' }}>
            Дата *
          </label>
          <select
            className="input"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          >
            <option value="">Выберите дату</option>
            {dates.map((date) => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>

          <label className="mt-2" style={{ display: 'block', marginBottom: '8px' }}>
            Время *
          </label>
          <select
            className="input"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          >
            <option value="">Выберите время</option>
            {TIME_SLOTS.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>

          <label className="mt-2" style={{ display: 'block', marginBottom: '8px' }}>
            Мастер *
          </label>
          <select
            className="input"
            value={formData.master}
            onChange={(e) => setFormData({ ...formData, master: e.target.value })}
          >
            <option value="">Выберите мастера</option>
            {MASTERS.map((m) => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>

          <label className="mt-2" style={{ display: 'block', marginBottom: '8px' }}>
            Услуга
          </label>
          <select
            className="input"
            value={formData.service}
            onChange={(e) => setFormData({ ...formData, service: e.target.value })}
          >
            <option value="">Не выбрано</option>
            {SERVICES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <Button fullWidth onClick={handleAdd} className="mt-3">
            Встать в очередь
          </Button>
        </Card>
      )}

      {loading ? (
        <div className="loading mt-3">Загрузка...</div>
      ) : waitlist.length === 0 ? (
        <Card className="mt-3">
          <p className="text-center text-hint">Лист ожидания пуст</p>
        </Card>
      ) : (
        <div className="mt-3">
          {waitlist.map((item) => (
            <Card key={item.id} className="mb-2">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3>{item.name}</h3>
                  <p className="text-hint">
                    {item.date} в {item.time}
                  </p>
                  <p className="text-hint">Мастер: {item.master}</p>
                  {item.service && (
                    <p className="text-hint">Услуга: {item.service}</p>
                  )}
                  <p className="text-hint" style={{ fontSize: '11px' }}>
                    Добавлен: {item.created_at}
                  </p>
                </div>
                {item.chat_id === user?.id && (
                  <Button
                    variant="danger"
                    onClick={() => handleRemove(item.id)}
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                  >
                    Удалить
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
