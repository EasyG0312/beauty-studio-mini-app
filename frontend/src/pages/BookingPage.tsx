import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useBookingStore } from '../store/bookingStore';
import { getAvailableSlots } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import type { BookingCreate } from '../types';

const SERVICES = [
  { name: 'Стрижка', price: 'от 1200 сом' },
  { name: 'Маникюр', price: 'от 900 сом' },
  { name: 'Массаж лица', price: 'от 1500 сом' },
  { name: 'Макияж', price: 'от 1800 сом' },
  { name: 'Окрашивание', price: 'от 2500 сом' },
];

const MASTERS = [
  { id: '1', name: 'Айгуль', spec: 'Стрижки, окрашивание', avatar: '👩‍🦰', image: '💁‍♀️' },
  { id: '2', name: 'Диана', spec: 'Маникюр, педикюр', avatar: '👩‍🦱', image: '💅' },
  { id: '3', name: 'Любой мастер', spec: '', avatar: '⭐', image: '✨' },
  { id: '4', name: 'Айгерим', spec: 'Макияж, брови', avatar: '👩', image: '💄' },
  { id: '5', name: 'Эльвира', spec: 'Массаж лица, уход', avatar: '👩‍🦳', image: '🧖‍♀️' },
];

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
];

export default function BookingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addBooking } = useBookingStore();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    service: '',
    master: '',
    date: '',
    time: '',
    name: '',
    phone: '',
    comment: '',
    is_on_the_way: false,
  });

  // Генерируем даты на 7 дней вперёд
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  });

  const getDayLabel = (dateStr: string) => {
    const date = new Date(dateStr.split('.').reverse().join('-'));
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Сегодня';
    if (date.toDateString() === tomorrow.toDateString()) return 'Завтра';
    
    return date.toLocaleDateString('ru-RU', { weekday: 'short' });
  };

  const handleDateSelect = (date: string) => {
    setFormData({ ...formData, date });
    setStep(2);
  };

  const handleMasterSelect = (master: string) => {
    setFormData({ ...formData, master });
    setStep(3);
  };

  const handleServiceSelect = (service: string) => {
    setFormData({ ...formData, service });
    setStep(4);
  };

  const handleTimeSelect = (time: string) => {
    setFormData({ ...formData, time });
    setStep(5);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      alert('Пожалуйста, заполните имя и телефон');
      return;
    }

    // Валидация телефона (+996XXXXXXXXX - 9 цифр после кода)
    const phonePattern = /^\+996\d{9}$/;
    const normalizedPhone = formData.phone.replace(/\D/g, '');
    
    // Если телефон введён без +, добавляем
    let finalPhone = formData.phone;
    if (!finalPhone.startsWith('+')) {
      finalPhone = '+' + finalPhone;
    }
    
    // Проверяем формат
    if (!phonePattern.test(finalPhone)) {
      // Пробуем нормализовать: если 12 цифр начиная с 996
      if (normalizedPhone.length === 12 && normalizedPhone.startsWith('996')) {
        finalPhone = '+' + normalizedPhone;
      } else if (normalizedPhone.length === 9) {
        // Если введены только 9 цифр, добавляем +996
        finalPhone = '+996' + normalizedPhone;
      } else {
        alert('Номер телефона должен быть в формате +996XXXXXXXXX (9 цифр после +996)');
        return;
      }
    }
    
    formData.phone = finalPhone;

    setLoading(true);
    try {
      const booking: BookingCreate = {
        name: formData.name,
        phone: formData.phone,
        service: formData.service,
        master: formData.master,
        date: formData.date,
        time: formData.time,
        comment: formData.comment || '',
        chat_id: user?.id,
      };

      await addBooking(booking);
      alert('Запись создана! Ожидайте подтверждения.');
      navigate('/my-bookings');
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Ошибка при создании записи';
      alert(errorMsg);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка доступных слотов при выборе даты и мастера
  useEffect(() => {
    if (step === 4 && formData.date && formData.master) {
      loadAvailableSlots();
    }
  }, [step]);

  const loadAvailableSlots = async () => {
    try {
      const data = await getAvailableSlots(formData.date, formData.master);
      setAvailableSlots(data.available_slots);
    } catch (error) {
      console.error('Failed to load slots:', error);
      setAvailableSlots(TIME_SLOTS);
    }
  };

  const handlePhoneChange = (value: string) => {
    // Разрешаем только цифры
    let cleaned = value.replace(/[^\d]/g, '');

    // Если начинается с 996, убираем
    if (cleaned.startsWith('996')) {
      cleaned = cleaned.slice(3);
    }
    // Если начинается с 8 и это номер КР, убираем
    if (cleaned.startsWith('8') && cleaned.length > 1) {
      cleaned = cleaned.slice(1);
    }

    // Ограничиваем 9 цифрами
    if (cleaned.length > 9) {
      cleaned = cleaned.slice(0, 9);
    }

    // Добавляем +996
    const formatted = '+996' + cleaned;

    setFormData({ ...formData, phone: formatted });
  };

  return (
    <div className="page">
      {/* Back Button */}
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
        <h1 style={{ margin: 0 }}>Запись</h1>
      </div>
      
      {/* Progress indicator */}
      <div className="mb-3">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', gap: '4px' }}>
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: step >= s ? 'var(--brand-gold)' : 'var(--tg-theme-secondary-bg-color)',
                transition: 'all 300ms ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* Step 1: Date with Calendar */}
      {step === 1 && (
        <Card>
          <h3>Выберите дату</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '8px' }} className="mt-2">
            {dates.map((date) => {
              const dateObj = new Date(date.split('.').reverse().join('-'));
              const isToday = dateObj.toDateString() === new Date().toDateString();
              return (
                <div
                  key={date}
                  onClick={() => handleDateSelect(date)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: formData.date === date ? 'var(--brand-gold)' : 'var(--tg-theme-secondary-bg-color)',
                    color: formData.date === date ? 'white' : 'var(--tg-theme-text-color)',
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                    border: isToday ? '2px solid var(--brand-gold)' : 'none',
                    fontWeight: formData.date === date ? '600' : '500',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{getDayLabel(date)}</div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>{date}</div>
                </div>
              );
            })}
          </div>
          <Button fullWidth onClick={() => setStep(2)} disabled={!formData.date} className="mt-3">
            Далее →
          </Button>
        </Card>
      )}

      {/* Step 2: Master with Photos */}
      {step === 2 && (
        <Card>
          <h3>Выберите мастера</h3>
          <p className="text-hint mb-2">Дата: {formData.date}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '12px' }} className="mt-2">
            {MASTERS.map((master) => (
              <div
                key={master.id}
                onClick={() => handleMasterSelect(master.name)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: formData.master === master.name ? 'var(--brand-gold)' : 'var(--tg-theme-secondary-bg-color)',
                  color: formData.master === master.name ? 'white' : 'var(--tg-theme-text-color)',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                }}
              >
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  flexShrink: 0,
                }}>
                  {master.image}
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '16px' }}>{master.name}</div>
                  {master.spec && <div style={{ fontSize: '12px', opacity: 0.8 }}>{master.spec}</div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px' }} className="mt-3">
            <Button variant="secondary" fullWidth onClick={() => setStep(1)}>
              ← Назад
            </Button>
            <Button fullWidth onClick={() => setStep(3)} disabled={!formData.master}>
              Далее →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Service */}
      {step === 3 && (
        <Card>
          <h3>Выберите услугу</h3>
          <p className="text-hint mb-2">Мастер: {formData.master}</p>
          <div className="mt-2">
            {SERVICES.map((service) => (
              <Button
                key={service.name}
                variant={formData.service === service.name ? 'primary' : 'secondary'}
                fullWidth
                className="mb-2"
                onClick={() => handleServiceSelect(service.name)}
              >
                <div style={{ textAlign: 'left', width: '100%' }}>
                  <div>{service.name}</div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>{service.price}</div>
                </div>
              </Button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px' }} className="mt-3">
            <Button variant="secondary" fullWidth onClick={() => setStep(2)}>
              ← Назад
            </Button>
            <Button fullWidth onClick={() => setStep(4)} disabled={!formData.service}>
              Далее →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Time */}
      {step === 4 && (
        <Card>
          <h3>Выберите время</h3>
          <p className="text-hint mb-2">
            {formData.date} | {formData.master}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }} className="mt-2">
            {availableSlots.map((time) => (
              <Button
                key={time}
                variant={formData.time === time ? 'primary' : 'secondary'}
                onClick={() => handleTimeSelect(time)}
              >
                {time}
              </Button>
            ))}
          </div>
          {availableSlots.length === 0 && (
            <p className="text-hint mt-2">К сожалению, нет свободного времени</p>
          )}
          <div style={{ display: 'flex', gap: '12px' }} className="mt-3">
            <Button variant="secondary" fullWidth onClick={() => setStep(3)}>
              ← Назад
            </Button>
            <Button fullWidth onClick={() => setStep(5)} disabled={!formData.time}>
              Далее →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 5: Name & Phone */}
      {step === 5 && (
        <Card>
          <h3>Ваши данные</h3>
          <p className="text-hint mb-2">
            {formData.date} в {formData.time} | {formData.service}
          </p>
          
          <input
            type="text"
            className="input mt-2"
            placeholder="Ваше имя"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          
          <input
            type="tel"
            className="input"
            placeholder="Телефон (+996 XXX XXX XX)"
            value={formData.phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            maxLength={13}
          />
          
          <textarea
            className="input"
            placeholder="Комментарий (необязательно)"
            value={formData.comment}
            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
            rows={3}
          />
          
          <div style={{ display: 'flex', gap: '12px' }} className="mt-3">
            <Button variant="secondary" fullWidth onClick={() => setStep(4)}>
              ← Назад
            </Button>
            <Button fullWidth onClick={handleSubmit} disabled={loading || !formData.name || !formData.phone}>
              {loading ? '⏳ Создаю...' : 'Записаться ✓'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

