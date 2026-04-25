import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../services/haptic';
import { IconChevronLeft, IconUser, IconStar, IconHelp } from '../components/Icons';

interface Master {
  id: string;
  name: string;
  spec: string;
  rating: number;
  reviews_count: number;
  photo?: string;
  next_available?: string;
}

const MASTERS: Master[] = [
  { id: '1', name: 'Айгуль', spec: 'Стрижки, окрашивание', rating: 4.9, reviews_count: 23, photo: '', next_available: '16:30' },
  { id: '2', name: 'Диана', spec: 'Маникюр, педикюр', rating: 4.8, reviews_count: 31, photo: '', next_available: '17:00' },
  { id: '3', name: 'Айгерим', spec: 'Макияж, брови', rating: 4.9, reviews_count: 19, photo: '', next_available: '18:30' },
  { id: '4', name: 'Эльвира', spec: 'Массаж лица, уход', rating: 4.7, reviews_count: 15, photo: '', next_available: '19:00' },
];

export default function MasterSelectPage() {
  const navigate = useNavigate();
  const [selectedMaster, setSelectedMaster] = useState<string | null>(null);

  const handleMasterSelect = (masterId: string) => {
    haptic.selection();
    setSelectedMaster(masterId);

    const master = MASTERS.find(m => m.id === masterId);
    if (master) {
      // Сохраняем выбор мастера
      sessionStorage.setItem('bookingMaster', master.name);

      // Проверяем, была ли уже выбрана дата
      const hasDate = sessionStorage.getItem('bookingDate');

      if (hasDate) {
        // Дата уже выбрана → сразу на форму
        navigate('/booking/form');
      } else {
        // Дата не выбрана → на выбор услуги
        sessionStorage.setItem('bookingStep', 'service');
        navigate('/booking/service');
      }
    }
  };

  const handleAnyMaster = () => {
    haptic.selection();
    sessionStorage.setItem('bookingMaster', 'all');

    // Проверяем, была ли уже выбрана дата
    const hasDate = sessionStorage.getItem('bookingDate');

    if (hasDate) {
      // Дата уже выбрана → сразу на форму
      navigate('/booking/form');
    } else {
      // Дата не выбрана → на выбор услуги
      sessionStorage.setItem('bookingStep', 'service');
      navigate('/booking/service');
    }
  };

  const openMasterProfile = (e: React.MouseEvent, master: Master) => {
    e.stopPropagation();
    haptic.selection();
    // TODO: Показать профиль мастера с отзывами
    alert(`Профиль: ${master.name}\nСпециализация: ${master.spec}\nРейтинг: ${master.rating} (${master.reviews_count} отзывов)`);
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <button 
          onClick={() => navigate('/booking')} 
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
          Выбрать специалиста
        </h1>
      </div>

      {/* Any Master Option */}
      <div 
        onClick={handleAnyMaster}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: 20,
          background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)',
          borderRadius: 16,
          marginBottom: 20,
          cursor: 'pointer',
          border: '2px solid transparent',
          transition: 'all 0.2s'
        }}
      >
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          background: 'var(--tg-theme-button-color, #4CAF50)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <IconUser size={28} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 4 }}>
            Любой специалист
          </div>
          <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color, #999)' }}>
            Система подберёт свободного мастера
          </div>
        </div>
      </div>

      {/* Masters List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {MASTERS.map((master) => (
          <div
            key={master.id}
            onClick={() => handleMasterSelect(master.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: 16,
              background: 'var(--tg-theme-bg-color, #fff)',
              borderRadius: 16,
              cursor: 'pointer',
              border: selectedMaster === master.id 
                ? '2px solid var(--tg-theme-button-color, #4CAF50)' 
                : '2px solid var(--tg-theme-secondary-bg-color, #f0f0f0)',
              transition: 'all 0.2s'
            }}
          >
            {/* Photo */}
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              background: master.photo 
                ? `url(${master.photo}) center/cover` 
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 24,
              color: '#fff',
              fontWeight: 600
            }}>
              {!master.photo && master.name.charAt(0)}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                marginBottom: 4 
              }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{master.name}</span>
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4,
                  color: '#FFB800',
                  fontSize: 14,
                  fontWeight: 500
                }}>
                  <IconStar size={14} />
                  {master.rating}
                </span>
              </div>
              
              <div style={{ 
                fontSize: 14, 
                color: 'var(--tg-theme-hint-color, #666)',
                marginBottom: 8,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {master.spec}
              </div>

              {/* Next Available Time */}
              {master.next_available && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  background: 'rgba(76, 175, 80, 0.1)',
                  borderRadius: 12,
                  fontSize: 13,
                  color: '#4CAF50',
                  fontWeight: 500
                }}>
                  Ближайшее: {master.next_available}
                </div>
              )}
            </div>

            {/* Info Button */}
            <button
              onClick={(e) => openMasterProfile(e, master)}
              style={{
                background: 'none',
                border: 'none',
                padding: 8,
                cursor: 'pointer',
                color: 'var(--tg-theme-hint-color, #999)'
              }}
            >
              <IconHelp size={20} />
            </button>
          </div>
        ))}
      </div>

      {/* Hint */}
      <p style={{ 
        marginTop: 24, 
        textAlign: 'center', 
        fontSize: 14, 
        color: 'var(--tg-theme-hint-color, #999)'
      }}>
        Нажмите на иконку ℹ️ для просмотра профиля и отзывов
      </p>
    </div>
  );
}
