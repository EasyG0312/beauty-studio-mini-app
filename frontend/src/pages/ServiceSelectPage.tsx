import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../services/haptic';
import { IconChevronLeft, IconScissors, IconNailPolish, IconMakeup, IconMassage, IconColorPalette } from '../components/Icons';

const SERVICES = [
  { name: 'Стрижка', price: 'от 1200 сом', icon: IconScissors, duration: '60 мин' },
  { name: 'Маникюр', price: 'от 900 сом', icon: IconNailPolish, duration: '45 мин' },
  { name: 'Массаж лица', price: 'от 1500 сом', icon: IconMassage, duration: '60 мин' },
  { name: 'Макияж', price: 'от 1800 сом', icon: IconMakeup, duration: '90 мин' },
  { name: 'Окрашивание', price: 'от 2500 сом', icon: IconColorPalette, duration: '120 мин' },
];

export default function ServiceSelectPage() {
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const handleServiceSelect = (serviceName: string) => {
    haptic.selection();
    setSelectedService(serviceName);
    
    sessionStorage.setItem('bookingService', serviceName);
    
    // Определяем следующий шаг
    const bookingStep = sessionStorage.getItem('bookingStep');
    const hasMaster = sessionStorage.getItem('bookingMaster');
    const hasDateTime = sessionStorage.getItem('bookingDate');
    
    if (bookingStep === 'service') {
      if (hasMaster && !hasDateTime) {
        // Выбрали мастера → услугу → теперь дата/время
        navigate('/booking/datetime');
      } else if (hasDateTime && !hasMaster) {
        // Выбрали дату/время → услугу → теперь мастер
        // Пока переходим на booking - там будет форма с выбором мастера
        navigate('/booking');
      } else {
        // Всё выбрано → форма
        navigate('/booking');
      }
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <button 
          onClick={() => navigate(-1)} 
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
          Выбрать услугу
        </h1>
      </div>

      {/* Services List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SERVICES.map((service) => {
          const Icon = service.icon;
          const isSelected = selectedService === service.name;
          
          return (
            <div
              key={service.name}
              onClick={() => handleServiceSelect(service.name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: 20,
                background: 'var(--tg-theme-bg-color, #fff)',
                borderRadius: 16,
                cursor: 'pointer',
                border: isSelected 
                  ? '2px solid var(--tg-theme-button-color, #4CAF50)' 
                  : '2px solid var(--tg-theme-secondary-bg-color, #f0f0f0)',
                transition: 'all 0.2s'
              }}
            >
              {/* Icon */}
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: isSelected 
                  ? 'var(--tg-theme-button-color, #4CAF50)' 
                  : 'var(--tg-theme-secondary-bg-color, #f5f5f5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon 
                  size={28} 
                  color={isSelected ? '#fff' : 'var(--tg-theme-text-color, #333)'} 
                />
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: 600, 
                  fontSize: 17, 
                  marginBottom: 4 
                }}>
                  {service.name}
                </div>
                <div style={{ 
                  fontSize: 14, 
                  color: 'var(--tg-theme-hint-color, #666)',
                  display: 'flex',
                  gap: 12
                }}>
                  <span>{service.price}</span>
                  <span>•</span>
                  <span>{service.duration}</span>
                </div>
              </div>

              {/* Checkmark */}
              {isSelected && (
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  background: 'var(--tg-theme-button-color, #4CAF50)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {(sessionStorage.getItem('bookingMaster') || sessionStorage.getItem('bookingDate')) && (
        <div style={{
          marginTop: 24,
          padding: 16,
          background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)',
          borderRadius: 12,
          fontSize: 14
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Ваш выбор:</div>
          {sessionStorage.getItem('bookingMaster') && (
            <div>Мастер: {sessionStorage.getItem('bookingMaster')}</div>
          )}
          {sessionStorage.getItem('bookingDate') && (
            <div>
              Дата/время: {sessionStorage.getItem('bookingDate')} {sessionStorage.getItem('bookingTime')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
