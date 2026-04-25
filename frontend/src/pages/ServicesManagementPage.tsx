import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../services/haptic';
import Card from '../components/Card';
import Button from '../components/Button';
import { 
  IconChevronLeft, IconPlus, IconX, IconEdit, IconClock, IconUser
} from '../components/Icons';

interface Service {
  id: string;
  name: string;
  category: string;
  duration: number; // minutes
  price: number;
  description?: string;
  masters: string[]; // master IDs
  isActive: boolean;
  color?: string;
}

const SERVICE_CATEGORIES = [
  { id: 'hair', name: 'Волосы', color: '#9C27B0' },
  { id: 'nails', name: 'Ногти', color: '#2196F3' },
  { id: 'makeup', name: 'Макияж', color: '#FF9800' },
  { id: 'massage', name: 'Массаж', color: '#4CAF50' },
  { id: 'brows', name: 'Брови', color: '#795548' },
  { id: 'other', name: 'Другое', color: '#607D8B' },
];

const MOCK_SERVICES: Service[] = [
  {
    id: '1',
    name: 'Женская стрижка',
    category: 'hair',
    duration: 60,
    price: 1200,
    description: 'Стрижка любой сложности с мытьём головы',
    masters: ['1', '2'],
    isActive: true,
    color: '#9C27B0'
  },
  {
    id: '2',
    name: 'Окрашивание',
    category: 'hair',
    duration: 150,
    price: 3500,
    description: 'Полное окрашивание волос',
    masters: ['1', '3'],
    isActive: true,
    color: '#9C27B0'
  },
  {
    id: '3',
    name: 'Маникюр + гель-лак',
    category: 'nails',
    duration: 90,
    price: 2000,
    description: 'Классический маникюр с покрытием',
    masters: ['2', '3'],
    isActive: true,
    color: '#2196F3'
  },
  {
    id: '4',
    name: 'Педикюр',
    category: 'nails',
    duration: 90,
    price: 2500,
    description: 'Педикюр с покрытием гель-лак',
    masters: ['2'],
    isActive: false,
    color: '#2196F3'
  },
  {
    id: '5',
    name: 'Дневной макияж',
    category: 'makeup',
    duration: 45,
    price: 1800,
    description: 'Натуральный макияж на каждый день',
    masters: ['1'],
    isActive: true,
    color: '#FF9800'
  },
];

const MASTER_NAMES: Record<string, string> = {
  '1': 'Айгуль',
  '2': 'Диана',
  '3': 'Айгерим',
};

export default function ServicesManagementPage() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [filter, setFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<Partial<Service>>({
    category: 'hair',
    duration: 60,
    price: 1000,
    isActive: true,
    masters: [],
  });

  const filteredServices = filter === 'all' 
    ? services 
    : services.filter(s => s.category === filter);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' сом';
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}ч ${mins}мин`;
    if (hours > 0) return `${hours}ч`;
    return `${mins}мин`;
  };

  const handleSave = () => {
    haptic.notification('success');
    if (editingService) {
      setServices(services.map(s => s.id === editingService.id ? { ...s, ...formData } as Service : s));
    } else {
      const newService: Service = {
        id: Date.now().toString(),
        name: formData.name || '',
        category: formData.category || 'hair',
        duration: formData.duration || 60,
        price: formData.price || 0,
        description: formData.description,
        masters: formData.masters || [],
        isActive: true,
        color: SERVICE_CATEGORIES.find(c => c.id === formData.category)?.color,
      };
      setServices([...services, newService]);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    haptic.notification('error');
    if (confirm('Удалить услугу?')) {
      setServices(services.filter(s => s.id !== id));
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingService(null);
    setFormData({
      category: 'hair',
      duration: 60,
      price: 1000,
      isActive: true,
      masters: [],
    });
  };

  const openEdit = (service: Service) => {
    haptic.selection();
    setEditingService(service);
    setFormData(service);
    setShowAddModal(true);
  };

  const toggleMaster = (masterId: string) => {
    const current = formData.masters || [];
    if (current.includes(masterId)) {
      setFormData({ ...formData, masters: current.filter(m => m !== masterId) });
    } else {
      setFormData({ ...formData, masters: [...current, masterId] });
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'none', border: 'none', padding: 8, marginLeft: -8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <IconChevronLeft size={24} />
        </button>
        <h1 className="page-title" style={{ fontFamily: 'var(--font-serif)', margin: 0, flex: 1 }}>
          Услуги
        </h1>
        <Button onClick={() => setShowAddModal(true)} size="sm">
          <IconPlus size={18} />
        </Button>
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '8px 14px',
            borderRadius: 20,
            border: 'none',
            background: filter === 'all' ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
            color: filter === 'all' ? '#fff' : 'var(--tg-theme-text-color)',
            fontSize: 13,
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          Все
        </button>
        {SERVICE_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            style={{
              padding: '8px 14px',
              borderRadius: 20,
              border: 'none',
              background: filter === cat.id ? cat.color : 'var(--tg-theme-secondary-bg-color)',
              color: filter === cat.id ? '#fff' : 'var(--tg-theme-text-color)',
              fontSize: 13,
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Services Count */}
      <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 12 }}>
        {filteredServices.length} услуг
        {filter !== 'all' && ` в категории "${SERVICE_CATEGORIES.find(c => c.id === filter)?.name}"`}
      </div>

      {/* Services List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredServices.map(service => {
          const category = SERVICE_CATEGORIES.find(c => c.id === service.category);
          return (
            <Card 
              key={service.id} 
              onClick={() => openEdit(service)}
              style={{ cursor: 'pointer', opacity: service.isActive ? 1 : 0.6 }}
            >
              <div style={{ display: 'flex', gap: 12 }}>
                {/* Color indicator */}
                <div style={{
                  width: 8,
                  borderRadius: 4,
                  background: category?.color || '#607D8B',
                  flexShrink: 0
                }} />
                
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 2 }}>
                        {service.name}
                        {!service.isActive && (
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: '#9E9E9E',
                            color: '#fff',
                            fontSize: 10,
                            marginLeft: 8
                          }}>
                            Неактивна
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                        {category?.name}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 18, color: '#4CAF50' }}>
                        {formatPrice(service.price)}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
                      <IconClock size={14} />
                      {formatDuration(service.duration)}
                    </span>
                    {service.masters.length > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
                        <IconUser size={14} />
                        {service.masters.map(id => MASTER_NAMES[id]).join(', ')}
                      </span>
                    )}
                  </div>

                  {service.description && (
                    <div style={{ marginTop: 6, fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
                      {service.description}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(service); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--tg-theme-button-color)' }}
                  >
                    <IconEdit size={18} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(service.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#f44336' }}
                  >
                    <IconX size={18} />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredServices.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💇‍♀️</div>
          <div style={{ fontSize: 16, color: 'var(--tg-theme-hint-color)' }}>
            Нет услуг в этой категории
          </div>
        </Card>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
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
          <Card style={{ width: '100%', maxWidth: 420, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>
                {editingService ? 'Редактировать' : 'Новая услуга'}
              </h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <IconX size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Название</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Женская стрижка"
                  style={{ width: '100%' }}
                  autoFocus
                />
              </div>

              {/* Category */}
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Категория</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {SERVICE_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setFormData({ ...formData, category: cat.id })}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 10,
                        border: 'none',
                        background: formData.category === cat.id ? cat.color : 'var(--tg-theme-secondary-bg-color)',
                        color: formData.category === cat.id ? '#fff' : 'var(--tg-theme-text-color)',
                        fontSize: 13,
                        cursor: 'pointer'
                      }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price & Duration */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Цена (сом)</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                    placeholder="1000"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Длительность (мин)</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.duration || ''}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                    placeholder="60"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Описание</label>
                <textarea
                  className="input"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Опишите услугу..."
                  style={{ width: '100%', minHeight: 80, resize: 'vertical' }}
                />
              </div>

              {/* Masters */}
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Мастера</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(MASTER_NAMES).map(([id, name]) => (
                    <button
                      key={id}
                      onClick={() => toggleMaster(id)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 10,
                        border: (formData.masters || []).includes(id) ? 'none' : '1px solid var(--tg-theme-hint-color)',
                        background: (formData.masters || []).includes(id) ? 'var(--tg-theme-button-color)' : 'transparent',
                        color: (formData.masters || []).includes(id) ? '#fff' : 'var(--tg-theme-text-color)',
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <IconUser size={14} />
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active status */}
              {editingService && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: 20, height: 20, cursor: 'pointer' }}
                  />
                  <label htmlFor="isActive" style={{ fontSize: 14, cursor: 'pointer' }}>
                    Услуга активна
                  </label>
                </div>
              )}

              <Button 
                onClick={handleSave} 
                fullWidth 
                disabled={!formData.name || !formData.price}
              >
                {editingService ? 'Сохранить' : 'Добавить услугу'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
