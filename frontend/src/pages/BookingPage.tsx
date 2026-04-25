import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useBookingStore } from '../store/bookingStore';
import { getAvailableSlots } from '../services/api';
import { haptic } from '../services/haptic';
import Card from '../components/Card';
import Button from '../components/Button';
import {
  IconChevronLeft, IconCalendar, IconUser,
  IconScissors, IconNailPolish, IconMakeup, IconMassage, IconColorPalette,
  IconCheck,
} from '../components/Icons';
import type { BookingCreate } from '../types';

const SERVICES = [
  { name: 'Стрижка', price: 'от 1200 сом', icon: IconScissors },
  { name: 'Маникюр', price: 'от 900 сом', icon: IconNailPolish },
  { name: 'Массаж лица', price: 'от 1500 сом', icon: IconMassage },
  { name: 'Макияж', price: 'от 1800 сом', icon: IconMakeup },
  { name: 'Окрашивание', price: 'от 2500 сом', icon: IconColorPalette },
];

const MASTERS = [
  { id: '1', name: 'Айгуль', spec: 'Стрижки, окрашивание' },
  { id: '2', name: 'Диана', spec: 'Маникюр, педикюр' },
  { id: '3', name: 'Любой мастер', spec: '' },
  { id: '4', name: 'Айгерим', spec: 'Макияж, брови' },
  { id: '5', name: 'Эльвира', spec: 'Массаж лица, уход' },
];

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
];

export default function BookingPage() {
  const navigate = useNavigate();
  const { user, login } = useAuthStore();
  const { addBooking } = useBookingStore();
  const isGuest = !user?.id;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [availableMasters, setAvailableMasters] = useState<string[]>([]);
  const [mastersLoading, setMastersLoading] = useState(false);

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

  // Загружаем данные из sessionStorage при монтировании
  useEffect(() => {
    const savedMaster = sessionStorage.getItem('bookingMaster');
    const savedService = sessionStorage.getItem('bookingService');
    const savedDate = sessionStorage.getItem('bookingDate');
    const savedTime = sessionStorage.getItem('bookingTime');

    if (savedMaster || savedService || savedDate) {
      setFormData(prev => ({
        ...prev,
        master: savedMaster || '',
        service: savedService || '',
        date: savedDate || '',
        time: savedTime || ''
      }));

      // Определяем текущий шаг
      if (savedDate && savedTime && savedService && savedMaster) {
        // Всё выбрано → финальная форма
        setStep(5);
      } else if (savedDate && savedTime && savedService) {
        // Выбрано дата+время+услуга, но нет мастера
        setStep(2); // Выбор мастера
      } else if (savedMaster && savedService) {
        // Выбран мастер и услуга, но нет даты
        setStep(4); // Выбор времени
      } else if (savedMaster) {
        // Только мастер → услуга
        setStep(3);
      } else if (savedDate) {
        // Только дата → услуга
        setStep(3);
      }
    }
  }, []);

  const clearBookingData = () => {
    sessionStorage.removeItem('bookingMaster');
    sessionStorage.removeItem('bookingService');
    sessionStorage.removeItem('bookingDate');
    sessionStorage.removeItem('bookingTime');
    sessionStorage.removeItem('bookingStep');
  };

  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  });

  const handleDateSelect = (date: string) => {
    haptic.selection();
    setFormData({ ...formData, date });
    setStep(2);
  };

  const handleMasterSelect = (masterName: string) => {
    haptic.selection();
    const masterValue = masterName === 'Любой мастер' ? 'all' : masterName;
    setFormData({ ...formData, master: masterValue });
    setStep(3);
  };

  const handleServiceSelect = (service: string) => {
    haptic.selection();
    setFormData({ ...formData, service });
    setStep(4);
  };

  const handleTimeSelect = (time: string) => {
    haptic.impact('soft');
    setFormData({ ...formData, time });
    setStep(5);
  };

  const handleLoginViaTelegram = async () => {
    setAuthError(null);
    setAuthLoading(true);

    try {
      const result = await login();
      if (!result.success) {
        setAuthError(result.error || 'Не удалось войти через Telegram. Откройте приложение через кнопку бота в Telegram и повторите попытку.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Telegram login error:', error);
      setAuthError('Не удалось войти через Telegram. Попробуйте снова.');
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      alert('Пожалуйста, заполните имя и телефон');
      return;
    }

    const phonePattern = /^\+996\d{9}$/;
    const normalizedPhone = formData.phone.replace(/\D/g, '');
    let finalPhone = formData.phone;
    if (!finalPhone.startsWith('+')) {
      finalPhone = '+' + finalPhone;
    }
    if (!phonePattern.test(finalPhone)) {
      if (normalizedPhone.length === 12 && normalizedPhone.startsWith('996')) {
        finalPhone = '+' + normalizedPhone;
      } else if (normalizedPhone.length === 9) {
        finalPhone = '+996' + normalizedPhone;
      } else {
        alert('Номер телефона должен быть в формате +996XXXXXXXXX (9 цифр после +996)');
        return;
      }
    }

    let currentChatId = user?.id;
    if (isGuest) {
      const loginSuccess = await handleLoginViaTelegram();
      if (!loginSuccess) {
        alert('Требуется авторизация через Telegram. Откройте приложение через кнопку бота в Telegram и авторизуйтесь, чтобы запись сохранилась в вашем аккаунте.');
        return;
      }
      currentChatId = useAuthStore.getState().user?.id || currentChatId;
    }

    // Проверяем занятость слота в реальном времени
    setLoading(true);
    try {
      const slotCheck = await getAvailableSlots(formData.date, formData.master);
      const isSlotTaken = !slotCheck.available_slots?.includes(formData.time);
      
      if (isSlotTaken) {
        haptic.notification('error');
        alert('⚠️ Этот слот уже занят другим клиентом. Пожалуйста, выберите другое время.');
        setStep(4); // Возвращаем на выбор времени
        loadAvailableSlots(); // Обновляем список доступных слотов
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Failed to check slot availability:', error);
      // Продолжаем запись даже если проверка не удалась
    }

    formData.phone = finalPhone;
    try {
      const booking: BookingCreate = {
        name: formData.name,
        phone: formData.phone,
        service: formData.service,
        master: formData.master,
        date: formData.date,
        time: formData.time,
        comment: formData.comment || '',
        chat_id: currentChatId,
      };
      await addBooking(booking);
      haptic.notification('success');
      clearBookingData(); // Очищаем временные данные
      alert('Запись создана! Ожидайте подтверждения.');
      navigate('/my-bookings');
    } catch (error: any) {
      haptic.notification('error');
      const errorMsg = error.response?.data?.detail || 'Ошибка при создании записи';
      alert(errorMsg);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 4 && formData.date && formData.master) {
      loadAvailableSlots();
    }
  }, [step]);

  useEffect(() => {
    // При входе на шаг 2 (выбор мастера) — если уже выбрана дата и время,
    // загружаем только доступных мастеров
    if (step === 2 && formData.date && formData.time) {
      loadAvailableMasters();
    }
  }, [step, formData.date, formData.time]);

  const loadAvailableSlots = async () => {
    try {
      setSlotsError(null);
      setLoading(true);
      const data = await getAvailableSlots(formData.date, formData.master);
      setAvailableSlots((data && (data as any).available_slots) || TIME_SLOTS);
    } catch (error: any) {
      console.error('Failed to load slots:', error);
      setSlotsError('Не удалось загрузить доступное время. Попробуйте позже.');
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableMasters = async () => {
    if (!formData.date || !formData.time) return;
    
    try {
      setMastersLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${API_URL}/api/masters/available?date=${formData.date}&time=${formData.time}`
      );
      const data = await response.json();
      setAvailableMasters(data.available_masters || []);
    } catch (error) {
      console.error('Failed to load available masters:', error);
      setAvailableMasters([]);
    } finally {
      setMastersLoading(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    let cleaned = value.replace(/[^\d]/g, '');
    if (cleaned.startsWith('996')) cleaned = cleaned.slice(3);
    if (cleaned.startsWith('8') && cleaned.length > 1) cleaned = cleaned.slice(1);
    if (cleaned.length > 9) cleaned = cleaned.slice(0, 9);
    const formatted = '+996' + cleaned;
    setFormData({ ...formData, phone: formatted });
  };

  const handleBack = () => {
    // Определяем куда идти назад на основе выбранных данных
    const hasMaster = sessionStorage.getItem('bookingMaster');
    const hasDate = sessionStorage.getItem('bookingDate');
    const hasService = sessionStorage.getItem('bookingService');

    if (hasDate && hasService && hasMaster) {
      // Всё выбрано → назад на выбор мастера
      navigate('/booking/master');
    } else if (hasDate && hasService && !hasMaster) {
      // Дата и услуга выбраны, мастер нет → назад на услугу
      navigate('/booking/service');
    } else if (hasMaster && hasService && !hasDate) {
      // Мастер и услуга выбраны, даты нет → назад на услугу
      navigate('/booking/service');
    } else if (hasDate) {
      // Только дата → назад на дату/время
      navigate('/booking/datetime');
    } else if (hasMaster) {
      // Только мастер → назад на мастера
      navigate('/booking/master');
    } else {
      // Ничего не выбрано → на начало
      navigate('/booking');
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={handleBack}
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
        <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>Запись</h1>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, gap: 4 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: step >= s ? 'var(--brand-gold)' : 'var(--gray-200)',
              transition: 'all 300ms ease',
            }}
          />
        ))}
      </div>

      {/* Step 1: Date */}
      {step === 1 && (
        <Card>
          <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: 20 }}>Выберите дату</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {dates.map((date) => {
              const dateObj = new Date(date.split('.').reverse().join('-'));
              const isToday = dateObj.toDateString() === new Date().toDateString();
              const dayOfWeek = dateObj.toLocaleDateString('ru-RU', { weekday: 'short' });
              const dayOfMonth = dateObj.getDate();
              const monthName = dateObj.toLocaleDateString('ru-RU', { month: 'short' });
              const isSelected = formData.date === date;

              return (
                <div
                  key={date}
                  onClick={() => handleDateSelect(date)}
                  style={{
                    padding: 18,
                    borderRadius: 16,
                    background: isSelected ? 'var(--brand-gold-gradient)' : 'var(--tg-theme-bg-color)',
                    color: isSelected ? 'white' : 'var(--tg-theme-text-color)',
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                    border: isToday ? '2px solid var(--brand-gold)' : `1px solid ${isSelected ? 'transparent' : 'var(--gray-100)'}`,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>{dayOfMonth}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 2 }}>{monthName}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{dayOfWeek}</div>
                  {isToday && (
                    <div style={{ fontSize: 10, opacity: 0.9, marginTop: 6, fontWeight: 600 }}>Сегодня</div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Step 2: Master */}
      {step === 2 && (
        <Card>
          <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: 8 }}>Выберите мастера</h3>
          <p className="text-hint" style={{ fontSize: 13, marginBottom: 20 }}>
            {formData.date && formData.time 
              ? `📅 ${formData.date} ⏰ ${formData.time} — показаны только свободные мастера`
              : `📅 ${formData.date || 'Дата не выбрана'}`
            }
          </p>
          
          {mastersLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <div className="text-hint" style={{ fontSize: 14 }}>
                Проверяем доступность мастеров...
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Если есть availableMasters (дата+время выбраны) — фильтруем по ним */}
              {(() => {
                const mastersToShow = (formData.date && formData.time && availableMasters.length > 0)
                  ? MASTERS.filter(m => availableMasters.includes(m.name) || m.name === 'Любой мастер')
                  : MASTERS;
                
                if (formData.date && formData.time && availableMasters.length === 0 && !mastersLoading) {
                  return (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>😔</div>
                      <div style={{ fontSize: 16, marginBottom: 8 }}>Нет свободных мастеров</div>
                      <div className="text-hint" style={{ fontSize: 13 }}>
                        На это время все мастера заняты или не работают
                      </div>
                      <Button variant="secondary" fullWidth onClick={() => setStep(1)} style={{ marginTop: 16 }}>
                        Выбрать другое время
                      </Button>
                    </div>
                  );
                }
                
                return mastersToShow.map((master) => (
                  <div
                    key={master.id}
                    onClick={() => handleMasterSelect(master.name)}
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      background: formData.master === master.name ? 'var(--brand-gold-subtle)' : 'var(--tg-theme-bg-color)',
                      border: formData.master === master.name ? '1px solid var(--brand-gold)' : '1px solid var(--gray-100)',
                      cursor: 'pointer',
                      transition: 'all 200ms ease',
                      display: 'flex',
                      gap: 16,
                      alignItems: 'center',
                      opacity: (formData.date && formData.time && !availableMasters.includes(master.name) && master.name !== 'Любой мастер') ? 0.5 : 1,
                    }}
                  >
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'var(--brand-gold-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: 18,
                      flexShrink: 0,
                    }}>
                      {master.name[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{master.name}</div>
                      {master.spec && <div className="text-hint" style={{ fontSize: 12, marginTop: 3 }}>{master.spec}</div>}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <Button variant="secondary" fullWidth onClick={() => setStep(1)}>Назад</Button>
            <Button fullWidth onClick={() => setStep(3)} disabled={!formData.master}>Далее</Button>
          </div>
        </Card>
      )}

      {/* Step 3: Service */}
      {step === 3 && (
        <Card>
          <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: 8 }}>Выберите услугу</h3>
          <p className="text-hint" style={{ fontSize: 13, marginBottom: 20 }}>Мастер: {formData.master}</p>
          <div>
            {SERVICES.map((service) => (
              <div
                key={service.name}
                onClick={() => handleServiceSelect(service.name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  marginBottom: 8,
                  borderRadius: 14,
                  background: formData.service === service.name ? 'var(--brand-gold-subtle)' : 'var(--tg-theme-bg-color)',
                  border: formData.service === service.name ? '1px solid var(--brand-gold)' : '1px solid var(--gray-100)',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'var(--brand-gold-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--brand-gold)',
                  }}>
                    <service.icon size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{service.name}</div>
                    <div className="text-hint" style={{ fontSize: 12, marginTop: 2 }}>{service.price}</div>
                  </div>
                </div>
                {formData.service === service.name && <IconCheck size={18} color="var(--brand-gold)" />}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <Button variant="secondary" fullWidth onClick={() => setStep(2)}>Назад</Button>
            <Button fullWidth onClick={() => setStep(4)} disabled={!formData.service}>Далее</Button>
          </div>
        </Card>
      )}

      {/* Step 4: Time */}
      {step === 4 && (
        <Card>
          <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: 8 }}>Выберите время</h3>
          <p className="text-hint" style={{ fontSize: 13, marginBottom: 20 }}>
            {formData.date} · {formData.master}
          </p>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <div className="spinner" />
            </div>
          ) : slotsError ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 16, marginBottom: 8, color: 'var(--color-danger)' }}>Ошибка загрузки</div>
              <div className="text-hint" style={{ fontSize: 13, marginBottom: 16 }}>{slotsError}</div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <Button onClick={loadAvailableSlots}>Повторить</Button>
                <Button variant="secondary" onClick={() => setStep(1)}>Другая дата</Button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {availableSlots.map((time) => (
                  <Button
                    key={time}
                    variant={formData.time === time ? 'primary' : 'secondary'}
                    onClick={() => handleTimeSelect(time)}
                    style={{ padding: '12px 8px', fontSize: 14 }}
                  >
                    {time}
                  </Button>
                ))}
              </div>
              {availableSlots.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <div style={{ fontSize: 16, marginBottom: 8, color: 'var(--color-warning)' }}>Нет свободного времени</div>
                  <div className="text-hint" style={{ fontSize: 13 }}>
                    Выберите другую дату или мастера.
                  </div>
                </div>
              )}
            </>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <Button variant="secondary" fullWidth onClick={() => setStep(3)}>Назад</Button>
            <Button fullWidth onClick={() => setStep(5)} disabled={!formData.time || availableSlots.length === 0}>Далее</Button>
          </div>
        </Card>
      )}

      {/* Step 5: Name & Phone */}
      {step === 5 && (
        <Card>
          <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: 8 }}>Ваши данные</h3>
          <p className="text-hint" style={{ fontSize: 13, marginBottom: 20 }}>
            {formData.date} в {formData.time} · {formData.service}
          </p>

          <div className="input-wrapper">
            <span className="input-icon"><IconUser size={18} /></span>
            <input
              type="text"
              className="input input-with-icon"
              placeholder="Ваше имя"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="input-wrapper">
            <span className="input-icon"><IconCalendar size={18} /></span>
            <input
              type="tel"
              className="input input-with-icon"
              placeholder="+996 XXX XXX XXX"
              value={formData.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              maxLength={13}
            />
          </div>

          {isGuest && (
            <div style={{
              marginBottom: 16,
              padding: '14px',
              background: 'rgba(255, 245, 210, 0.7)',
              borderRadius: 16,
              border: '1px solid rgba(201, 169, 110, 0.8)',
              color: '#5b4f2d',
              fontSize: 13,
            }}>
              <div style={{ marginBottom: 10 }}>
                Чтобы запись сохранилась в вашем аккаунте, откройте приложение через кнопку бота в Telegram и авторизуйтесь.
                Если вы уже внутри Telegram, нажмите кнопку ниже.
              </div>
              <Button
                fullWidth
                variant="primary"
                onClick={handleLoginViaTelegram}
                disabled={authLoading}
                style={{ marginBottom: authError ? 12 : 0 }}
              >
                {authLoading ? 'Входим...' : 'Войти через Telegram'}
              </Button>
              {authError && (
                <div style={{ marginTop: 8, color: 'var(--color-danger)', fontSize: 13 }}>
                  {authError}
                </div>
              )}
            </div>
          )}

          <textarea
            className="input"
            placeholder="Комментарий (необязательно)"
            value={formData.comment}
            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
            rows={3}
          />

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <Button variant="secondary" fullWidth onClick={handleBack}>Назад</Button>
            <Button fullWidth onClick={handleSubmit} disabled={loading || !formData.name || !formData.phone}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Записаться'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
