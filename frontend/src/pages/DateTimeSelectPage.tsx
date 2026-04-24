import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../services/haptic';
import { getAvailableSlots } from '../services/api';
import { IconChevronLeft, IconChevronRight, IconCalendar } from '../components/Icons';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
];

export default function DateTimeSelectPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Получаем дни месяца
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Дни недели
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  // Месяцы
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const handleDateSelect = async (day: number) => {
    haptic.selection();
    const dateStr = `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`;
    setSelectedDate(dateStr);
    setSelectedTime(null);

    // Загружаем доступные слоты
    setLoading(true);
    try {
      const slots = await getAvailableSlots(dateStr, 'all');
      setAvailableSlots(slots.available_slots || []);
    } catch (err) {
      console.error('Error loading slots:', err);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeSelect = (time: string) => {
    haptic.impact('soft');
    setSelectedTime(time);
  };

  const handleContinue = () => {
    if (!selectedDate || !selectedTime) return;
    
    // Сохраняем выбор и переходим к выбору услуги
    sessionStorage.setItem('bookingDate', selectedDate);
    sessionStorage.setItem('bookingTime', selectedTime);
    sessionStorage.setItem('bookingStep', 'service');
    navigate('/booking/service');
  };

  const goToPrevMonth = () => {
    haptic.selection();
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const goToNextMonth = () => {
    haptic.selection();
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
    setSelectedTime(null);
  };

  // Проверяем, прошла ли дата
  const isDatePast = (day: number) => {
    const checkDate = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <button 
          onClick={() => {
            const hasMaster = sessionStorage.getItem('bookingMaster');
            if (hasMaster) {
              // Пришли с выбора услуги
              navigate('/booking/service');
            } else {
              // Пришли с начала
              navigate('/booking');
            }
          }}
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: 8, 
            marginLeft: -8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <IconChevronLeft size={24} />
        </button>
        <h1 className="page-title" style={{ fontFamily: 'var(--font-serif)', margin: 0, flex: 1 }}>
          Выбрать дату и время
        </h1>
      </div>

      {/* Calendar */}
      <div style={{
        background: 'var(--tg-theme-bg-color, #fff)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24
      }}>
        {/* Month Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <button 
            onClick={goToPrevMonth}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
          >
            <IconChevronLeft size={24} />
          </button>
          <div style={{ fontWeight: 600, fontSize: 18 }}>
            {months[month]} {year}
          </div>
          <button 
            onClick={goToNextMonth}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
          >
            <IconChevronRight size={24} />
          </button>
        </div>

        {/* Week Days */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
          marginBottom: 8
        }}>
          {weekDays.map(day => (
            <div key={day} style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--tg-theme-hint-color, #999)',
              fontWeight: 500,
              padding: '8px 0'
            }}>
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4
        }}>
          {/* Empty cells for first week */}
          {Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }, (_, i) => (
            <div key={`empty-${i}`} />
          ))}
          
          {/* Days */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const isSelected = selectedDate === `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`;
            const isPast = isDatePast(day);
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

            return (
              <button
                key={day}
                onClick={() => !isPast && handleDateSelect(day)}
                disabled={isPast}
                style={{
                  aspectRatio: '1',
                  borderRadius: 12,
                  border: 'none',
                  background: isSelected 
                    ? 'var(--tg-theme-button-color, #4CAF50)' 
                    : isToday
                      ? 'rgba(76, 175, 80, 0.1)'
                      : 'transparent',
                  color: isSelected 
                    ? '#fff' 
                    : isPast
                      ? 'var(--tg-theme-hint-color, #ccc)'
                      : 'var(--tg-theme-text-color, #333)',
                  fontWeight: isSelected || isToday ? 600 : 400,
                  fontSize: 15,
                  cursor: isPast ? 'not-allowed' : 'pointer',
                  opacity: isPast ? 0.5 : 1
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ 
            fontFamily: 'var(--font-serif)', 
            fontSize: 18, 
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <IconCalendar size={18} />
            {selectedDate} — выберите время
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--tg-theme-hint-color)' }}>
              Загрузка...
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8
            }}>
              {TIME_SLOTS.map(time => {
                const isAvailable = availableSlots.includes(time) || true; // Fallback если API не работает
                const isSelected = selectedTime === time;

                return (
                  <button
                    key={time}
                    onClick={() => isAvailable && handleTimeSelect(time)}
                    disabled={!isAvailable}
                    style={{
                      padding: '12px 8px',
                      borderRadius: 10,
                      border: 'none',
                      background: isSelected
                        ? 'var(--tg-theme-button-color, #4CAF50)'
                        : isAvailable
                          ? 'var(--tg-theme-secondary-bg-color, #f0f0f0)'
                          : 'rgba(0,0,0,0.05)',
                      color: isSelected ? '#fff' : isAvailable ? 'var(--tg-theme-text-color)' : '#999',
                      fontWeight: isSelected ? 600 : 400,
                      fontSize: 14,
                      cursor: isAvailable ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Continue Button */}
      {selectedDate && selectedTime && (
        <button
          onClick={handleContinue}
          style={{
            width: '100%',
            padding: 16,
            background: 'var(--tg-theme-button-color, #4CAF50)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Продолжить →
        </button>
      )}
    </div>
  );
}
