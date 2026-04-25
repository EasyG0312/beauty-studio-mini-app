import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../services/haptic';
import Card from '../components/Card';
import Button from '../components/Button';
import { 
  IconChevronLeft, IconPlus, IconEdit, IconX, 
  IconScissors, IconNailPolish, IconMakeup, IconMassage, 
  IconStar, IconCalendar, IconChart 
} from '../components/Icons';

interface Master {
  id: string;
  name: string;
  specialization: string[];
  phone: string;
  email: string;
  photo?: string;
  rating: number;
  reviews_count: number;
  is_active: boolean;
  join_date: string;
  commission_rate: number; // процент от выручки
}

const SPECIALIZATIONS = [
  { id: 'haircut', name: 'Стрижки', icon: IconScissors },
  { id: 'manicure', name: 'Маникюр', icon: IconNailPolish },
  { id: 'makeup', name: 'Макияж', icon: IconMakeup },
  { id: 'massage', name: 'Массаж', icon: IconMassage },
];

// Моковые данные (в реальности будут с бэкенда)
const MOCK_MASTERS: Master[] = [
  {
    id: '1',
    name: 'Айгуль',
    specialization: ['haircut', 'coloring'],
    phone: '+996 555 123 456',
    email: 'aigul@beautystudio.kg',
    rating: 4.9,
    reviews_count: 23,
    is_active: true,
    join_date: '2024-01-15',
    commission_rate: 40,
  },
  {
    id: '2',
    name: 'Диана',
    specialization: ['manicure', 'pedicure'],
    phone: '+996 555 234 567',
    email: 'diana@beautystudio.kg',
    rating: 4.8,
    reviews_count: 31,
    is_active: true,
    join_date: '2024-02-20',
    commission_rate: 35,
  },
  {
    id: '3',
    name: 'Айгерим',
    specialization: ['makeup', 'brows'],
    phone: '+996 555 345 678',
    email: 'aigerim@beautystudio.kg',
    rating: 4.9,
    reviews_count: 19,
    is_active: true,
    join_date: '2024-03-10',
    commission_rate: 45,
  },
];

export default function MasterManagementPage() {
  const navigate = useNavigate();
  const [masters, setMasters] = useState<Master[]>(MOCK_MASTERS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState<Master | null>(null);
  const [showStats, setShowStats] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    specialization: [] as string[],
    commission_rate: 40,
  });

  const handleAdd = () => {
    haptic.selection();
    setFormData({
      name: '',
      phone: '',
      email: '',
      specialization: [],
      commission_rate: 40,
    });
    setShowAddModal(true);
  };

  const handleEdit = (master: Master) => {
    haptic.selection();
    setSelectedMaster(master);
    setFormData({
      name: master.name,
      phone: master.phone,
      email: master.email,
      specialization: master.specialization,
      commission_rate: master.commission_rate,
    });
    setShowEditModal(true);
  };

  const handleDelete = (masterId: string) => {
    haptic.notification('error');
    if (confirm('Вы уверены? Мастер будет деактивирован.')) {
      setMasters(masters.map(m => 
        m.id === masterId ? { ...m, is_active: false } : m
      ));
    }
  };

  const handleToggleSpec = (specId: string) => {
    setFormData(prev => ({
      ...prev,
      specialization: prev.specialization.includes(specId)
        ? prev.specialization.filter(s => s !== specId)
        : [...prev.specialization, specId]
    }));
  };

  const handleSubmit = () => {
    haptic.notification('success');
    if (showAddModal) {
      const newMaster: Master = {
        id: Date.now().toString(),
        ...formData,
        rating: 0,
        reviews_count: 0,
        is_active: true,
        join_date: new Date().toISOString().split('T')[0],
      };
      setMasters([...masters, newMaster]);
      setShowAddModal(false);
    } else if (showEditModal && selectedMaster) {
      setMasters(masters.map(m => 
        m.id === selectedMaster.id ? { ...m, ...formData } : m
      ));
      setShowEditModal(false);
    }
  };

  const viewStats = (masterId: string) => {
    haptic.selection();
    setShowStats(showStats === masterId ? null : masterId);
  };

  const activeMasters = masters.filter(m => m.is_active);
  const inactiveMasters = masters.filter(m => !m.is_active);

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
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
          Управление мастерами
        </h1>
        <Button onClick={handleAdd} size="sm">
          <IconPlus size={18} />
        </Button>
      </div>

      {/* Stats Summary */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>Всего мастеров</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{activeMasters.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>Средний рейтинг</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {(activeMasters.reduce((sum, m) => sum + m.rating, 0) / activeMasters.length || 0).toFixed(1)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>Всего отзывов</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {activeMasters.reduce((sum, m) => sum + m.reviews_count, 0)}
            </div>
          </div>
        </div>
      </Card>

      {/* Active Masters */}
      <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: 16 }}>Активные мастера</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {activeMasters.map((master) => (
          <Card key={master.id}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 17 }}>{master.name}</span>
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 4,
                    color: '#FFB800',
                    fontSize: 14 
                  }}>
                    <IconStar size={14} />
                    {master.rating}
                  </span>
                </div>

                <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 8 }}>
                  {master.phone}
                </div>

                {/* Specializations */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {master.specialization.map(spec => {
                    const specInfo = SPECIALIZATIONS.find(s => s.id === spec);
                    return (
                      <span key={spec} style={{
                        padding: '4px 10px',
                        background: 'var(--tg-theme-secondary-bg-color)',
                        borderRadius: 12,
                        fontSize: 12
                      }}>
                        {specInfo?.name || spec}
                      </span>
                    );
                  })}
                </div>

                {/* Commission */}
                <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
                  Комиссия: {master.commission_rate}%
                </div>

                {/* Stats (if expanded) */}
                {showStats === master.id && (
                  <div style={{ 
                    marginTop: 12, 
                    padding: 12, 
                    background: 'var(--tg-theme-secondary-bg-color)',
                    borderRadius: 12
                  }}>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>Записей</div>
                        <div style={{ fontWeight: 600 }}>45</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>Выручка</div>
                        <div style={{ fontWeight: 600 }}>125,000 сом</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>Зарплата</div>
                        <div style={{ fontWeight: 600 }}>50,000 сом</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => viewStats(master.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 8,
                    color: 'var(--tg-theme-hint-color)'
                  }}
                >
                  <IconChart size={20} />
                </button>
                <button
                  onClick={() => navigate('/master-schedule')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 8,
                    color: 'var(--tg-theme-hint-color)'
                  }}
                >
                  <IconCalendar size={20} />
                </button>
                <button
                  onClick={() => handleEdit(master)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 8,
                    color: 'var(--tg-theme-hint-color)'
                  }}
                >
                  <IconEdit size={20} />
                </button>
                <button
                  onClick={() => handleDelete(master.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 8,
                    color: '#ff4444'
                  }}
                >
                  <IconX size={20} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Inactive Masters */}
      {inactiveMasters.length > 0 && (
        <>
          <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: 16, opacity: 0.6 }}>Неактивные</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: 0.6 }}>
            {inactiveMasters.map((master) => (
              <Card key={master.id}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    background: 'var(--tg-theme-secondary-bg-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    color: 'var(--tg-theme-hint-color)'
                  }}>
                    {master.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{master.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
                      Неактивен с {master.join_date}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <Card style={{ width: '100%', maxWidth: 400, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>
                {showAddModal ? 'Новый мастер' : 'Редактировать'}
              </h3>
              <button 
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <IconX size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Имя</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Имя мастера"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Телефон</label>
                <input
                  type="tel"
                  className="input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+996 XXX XXX XXX"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  className="input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Специализации</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {SPECIALIZATIONS.map(spec => {
                    const isSelected = formData.specialization.includes(spec.id);
                    return (
                      <button
                        key={spec.id}
                        onClick={() => handleToggleSpec(spec.id)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 20,
                          border: isSelected ? 'none' : '1px solid var(--tg-theme-hint-color)',
                          background: isSelected ? 'var(--tg-theme-button-color)' : 'transparent',
                          color: isSelected ? '#fff' : 'var(--tg-theme-text-color)',
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <spec.icon size={14} />
                        {spec.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>
                  Комиссия (% от выручки)
                </label>
                <input
                  type="number"
                  className="input"
                  value={formData.commission_rate}
                  onChange={(e) => setFormData({ ...formData, commission_rate: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="100"
                  style={{ width: '100%' }}
                />
              </div>

              <Button 
                onClick={handleSubmit} 
                fullWidth 
                disabled={!formData.name || !formData.phone}
              >
                {showAddModal ? 'Добавить' : 'Сохранить'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
