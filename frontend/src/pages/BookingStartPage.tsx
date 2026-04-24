import { useNavigate } from 'react-router-dom';
import { haptic } from '../services/haptic';
import { IconChevronLeft, IconUser, IconCalendar } from '../components/Icons';

export default function BookingStartPage() {
  const navigate = useNavigate();

  const handleMasterRoute = () => {
    haptic.selection();
    // Очищаем предыдущие данные
    sessionStorage.removeItem('bookingMaster');
    sessionStorage.removeItem('bookingService');
    sessionStorage.removeItem('bookingDate');
    sessionStorage.removeItem('bookingTime');
    navigate('/booking/master');
  };

  const handleDateRoute = () => {
    haptic.selection();
    // Очищаем предыдущие данные
    sessionStorage.removeItem('bookingMaster');
    sessionStorage.removeItem('bookingService');
    sessionStorage.removeItem('bookingDate');
    sessionStorage.removeItem('bookingTime');
    navigate('/booking/datetime');
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 32 }}>
        <button 
          onClick={() => navigate('/')} 
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
          Записаться
        </h1>
      </div>

      <p style={{ 
        fontSize: 16, 
        color: 'var(--tg-theme-hint-color, #666)',
        marginBottom: 32,
        textAlign: 'center'
      }}>
        Выберите удобный способ записи
      </p>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* By Master */}
        <div
          onClick={handleMasterRoute}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: 24,
            background: 'var(--tg-theme-bg-color, #fff)',
            borderRadius: 20,
            cursor: 'pointer',
            border: '2px solid var(--tg-theme-secondary-bg-color, #f0f0f0)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--tg-theme-button-color, #4CAF50)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--tg-theme-secondary-bg-color, #f0f0f0)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <IconUser size={32} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
              Выбрать специалиста
            </div>
            <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color, #666)', lineHeight: 1.5 }}>
              Выберите мастера, услугу и удобное время
            </div>
          </div>
          <div style={{ transform: 'rotate(180deg)' }}><IconChevronLeft size={24} /></div>
        </div>

        {/* By Date */}
        <div
          onClick={handleDateRoute}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: 24,
            background: 'var(--tg-theme-bg-color, #fff)',
            borderRadius: 20,
            cursor: 'pointer',
            border: '2px solid var(--tg-theme-secondary-bg-color, #f0f0f0)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--tg-theme-button-color, #4CAF50)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--tg-theme-secondary-bg-color, #f0f0f0)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <IconCalendar size={32} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
              Выбрать дату и время
            </div>
            <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color, #666)', lineHeight: 1.5 }}>
              Сначала выберите удобное время, затем мастера
            </div>
          </div>
          <div style={{ transform: 'rotate(180deg)' }}><IconChevronLeft size={24} /></div>
        </div>
      </div>
    </div>
  );
}
