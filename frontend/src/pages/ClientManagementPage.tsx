import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../services/haptic';
import Card from '../components/Card';
import Button from '../components/Button';
import { 
  IconChevronLeft, IconSearch, IconUser, IconCalendar,
  IconStar, IconMessage, IconX, 
  IconHeart, IconAlertTriangle, IconGift, IconEdit
} from '../components/Icons';

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  birthDate?: string;
  tags: string[];
  preferences: string[];
  allergies: string[];
  visitCount: number;
  totalSpent: number;
  lastVisit?: string;
  nextVisit?: string;
  loyaltyPoints: number;
  notes: string;
  isVip: boolean;
  source: 'telegram' | 'instagram' | 'referral' | 'walk-in' | 'other';
}

interface Visit {
  id: string;
  date: string;
  service: string;
  master: string;
  price: number;
  rating?: number;
  notes?: string;
}

const CLIENT_TAGS = [
  { id: 'vip', name: 'VIP', color: '#FFD700' },
  { id: 'regular', name: 'Постоянный', color: '#4CAF50' },
  { id: 'new', name: 'Новый', color: '#2196F3' },
  { id: 'problem', name: 'Проблемный', color: '#f44336' },
  { id: 'referral', name: 'Рекомендатель', color: '#9C27B0' },
];

const PREFERENCE_OPTIONS = [
  'Чай перед процедурой',
  'Кофе перед процедурой',
  'Тихая атмосфера',
  'Разговорчивый мастер',
  'Быстро',
  'Качественно (не торопить)',
  'Утренние записи',
  'Вечерние записи',
];

const ALLERGY_OPTIONS = [
  'Никель',
  'Латекс',
  'Акрил',
  'Краска для волос',
  'Парфюм',
  'Лак для ногтей',
];

const MOCK_CLIENTS: Client[] = [
  {
    id: '1',
    name: 'Айжан К',
    phone: '+996 555 123 456',
    email: 'aizhan@email.com',
    birthDate: '15.03.1995',
    tags: ['vip', 'regular'],
    preferences: ['Чай перед процедурой', 'Тихая атмосфера'],
    allergies: ['Никель'],
    visitCount: 24,
    totalSpent: 48500,
    lastVisit: '23.04.2026',
    nextVisit: '30.04.2026',
    loyaltyPoints: 485,
    notes: 'Любит Айгуль, всегда стрижётся только у неё',
    isVip: true,
    source: 'telegram',
  },
  {
    id: '2',
    name: 'Мария С',
    phone: '+996 777 987 654',
    tags: ['regular'],
    preferences: ['Кофе перед процедурой', 'Быстро'],
    allergies: [],
    visitCount: 12,
    totalSpent: 28400,
    lastVisit: '20.04.2026',
    loyaltyPoints: 284,
    notes: 'Предпочитает утренние записи',
    isVip: false,
    source: 'instagram',
  },
  {
    id: '3',
    name: 'Салтанат Б',
    phone: '+996 555 456 789',
    tags: ['new'],
    preferences: [],
    allergies: [],
    visitCount: 2,
    totalSpent: 3500,
    lastVisit: '18.04.2026',
    loyaltyPoints: 35,
    notes: 'Пришла по рекомендации от Айжан',
    isVip: false,
    source: 'referral',
  },
  {
    id: '4',
    name: 'Гульнара А',
    phone: '+996 777 111 222',
    tags: ['problem', 'regular'],
    preferences: ['Качественно (не торопить)'],
    allergies: ['Латекс'],
    visitCount: 8,
    totalSpent: 15600,
    lastVisit: '15.04.2026',
    loyaltyPoints: 156,
    notes: 'Очень придирчивая, нужен опытный мастер',
    isVip: false,
    source: 'walk-in',
  },
];

const MOCK_VISITS: Visit[] = [
  { id: '1', date: '23.04.2026', service: 'Женская стрижка', master: 'Айгуль', price: 1200, rating: 5, notes: 'Довольна результатом' },
  { id: '2', date: '10.04.2026', service: 'Окрашивание', master: 'Айгуль', price: 3500, rating: 5 },
  { id: '3', date: '25.03.2026', service: 'Маникюр', master: 'Диана', price: 2000, rating: 4 },
  { id: '4', date: '15.03.2026', service: 'Укладка', master: 'Айгерим', price: 800, rating: 5 },
];

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' сом';
};

export default function ClientManagementPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'notes'>('info');

  const filteredClients = clients.filter(client => {
    if (searchQuery && !client.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !client.phone.includes(searchQuery)) return false;
    if (filterTag && !client.tags.includes(filterTag)) return false;
    return true;
  });

  const openDetail = (client: Client) => {
    haptic.selection();
    setSelectedClient(client);
    setShowDetailModal(true);
    setActiveTab('info');
  };

  const openEdit = (client: Client) => {
    setSelectedClient(client);
    setEditForm(client);
    setShowEditModal(true);
    setShowDetailModal(false);
  };

  const saveEdit = () => {
    haptic.notification('success');
    if (selectedClient) {
      setClients(clients.map(c => c.id === selectedClient.id ? { ...c, ...editForm } as Client : c));
    }
    setShowEditModal(false);
  };

  const toggleTag = (tagId: string) => {
    const current = editForm.tags || [];
    if (current.includes(tagId)) {
      setEditForm({ ...editForm, tags: current.filter(t => t !== tagId) });
    } else {
      setEditForm({ ...editForm, tags: [...current, tagId] });
    }
  };

  const togglePreference = (pref: string) => {
    const current = editForm.preferences || [];
    if (current.includes(pref)) {
      setEditForm({ ...editForm, preferences: current.filter(p => p !== pref) });
    } else {
      setEditForm({ ...editForm, preferences: [...current, pref] });
    }
  };

  const toggleAllergy = (allergy: string) => {
    const current = editForm.allergies || [];
    if (current.includes(allergy)) {
      setEditForm({ ...editForm, allergies: current.filter(a => a !== allergy) });
    } else {
      setEditForm({ ...editForm, allergies: [...current, allergy] });
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'none', border: 'none', padding: 8, marginLeft: -8, cursor: 'pointer' }}
        >
          <IconChevronLeft size={24} />
        </button>
        <h1 className="page-title" style={{ fontFamily: 'var(--font-serif)', margin: 0, flex: 1 }}>
          Клиентская база
        </h1>
        <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
          {clients.length} клиентов
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--tg-theme-hint-color)' }}>
            <IconSearch size={18} />
          </div>
          <input
            type="text"
            className="input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени или телефону..."
            style={{ width: '100%', paddingLeft: 40 }}
          />
        </div>
      </div>

      {/* Tags filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        <button
          onClick={() => setFilterTag(null)}
          style={{
            padding: '6px 12px',
            borderRadius: 16,
            border: 'none',
            background: filterTag === null ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
            color: filterTag === null ? '#fff' : 'var(--tg-theme-text-color)',
            fontSize: 12,
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          Все
        </button>
        {CLIENT_TAGS.map(tag => (
          <button
            key={tag.id}
            onClick={() => setFilterTag(tag.id === filterTag ? null : tag.id)}
            style={{
              padding: '6px 12px',
              borderRadius: 16,
              border: 'none',
              background: filterTag === tag.id ? tag.color : 'var(--tg-theme-secondary-bg-color)',
              color: filterTag === tag.id ? '#fff' : 'var(--tg-theme-text-color)',
              fontSize: 12,
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {tag.name}
          </button>
        ))}
      </div>

      {/* Clients List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredClients.map(client => (
          <Card key={client.id} onClick={() => openDetail(client)} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              {/* Avatar */}
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                background: client.isVip 
                  ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 22,
                fontWeight: 600,
                flexShrink: 0
              }}>
                {client.name.charAt(0)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{client.name}</span>
                  {client.isVip && <span style={{ fontSize: 16 }}>👑</span>}
                  {client.tags.map(tagId => {
                    const tag = CLIENT_TAGS.find(t => t.id === tagId);
                    return tag ? (
                      <span key={tagId} style={{
                        padding: '2px 6px',
                        borderRadius: 8,
                        fontSize: 10,
                        background: tag.color,
                        color: '#fff'
                      }}>
                        {tag.name}
                      </span>
                    ) : null;
                  })}
                </div>

                <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 6 }}>
                  {client.phone}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                    <IconCalendar size={12} />
                    {client.visitCount} визитов
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#4CAF50', fontWeight: 500 }}>
                    <IconGift size={12} />
                    {client.loyaltyPoints} баллов
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--tg-theme-text-color)', fontWeight: 500 }}>
                    {formatMoney(client.totalSpent)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
          <div style={{ fontSize: 16, color: 'var(--tg-theme-hint-color)' }}>
            Клиенты не найдены
          </div>
        </Card>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedClient && (
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
          <Card style={{ width: '100%', maxWidth: 450, maxHeight: '90vh', overflow: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  background: selectedClient.isVip 
                    ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 26,
                  fontWeight: 600
                }}>
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {selectedClient.name}
                    {selectedClient.isVip && <span>👑</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>
                    {selectedClient.phone}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <IconX size={24} />
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              <div style={{ textAlign: 'center', padding: 12, background: 'var(--tg-theme-secondary-bg-color)', borderRadius: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#4CAF50' }}>{selectedClient.visitCount}</div>
                <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)' }}>Визитов</div>
              </div>
              <div style={{ textAlign: 'center', padding: 12, background: 'var(--tg-theme-secondary-bg-color)', borderRadius: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{formatMoney(selectedClient.totalSpent)}</div>
                <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)' }}>Потрачено</div>
              </div>
              <div style={{ textAlign: 'center', padding: 12, background: 'var(--tg-theme-secondary-bg-color)', borderRadius: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#FF9800' }}>{selectedClient.loyaltyPoints}</div>
                <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)' }}>Баллов</div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--tg-theme-hint-color)', paddingBottom: 8 }}>
              {[
                { id: 'info', label: 'Инфо', icon: IconUser },
                { id: 'history', label: 'История', icon: IconCalendar },
                { id: 'notes', label: 'Заметки', icon: IconMessage },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 8,
                      border: 'none',
                      background: activeTab === tab.id ? 'var(--tg-theme-button-color)' : 'transparent',
                      color: activeTab === tab.id ? '#fff' : 'var(--tg-theme-text-color)',
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            {activeTab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Tags */}
                <div>
                  <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 6 }}>Теги</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedClient.tags.length > 0 ? selectedClient.tags.map(tagId => {
                      const tag = CLIENT_TAGS.find(t => t.id === tagId);
                      return tag ? (
                        <span key={tagId} style={{
                          padding: '4px 10px',
                          borderRadius: 12,
                          fontSize: 12,
                          background: tag.color,
                          color: '#fff'
                        }}>
                          {tag.name}
                        </span>
                      ) : null;
                    }) : <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>Нет тегов</span>}
                  </div>
                </div>

                {/* Preferences */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <IconHeart size={14} color="#f44336" />
                    <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>Предпочтения</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedClient.preferences.length > 0 ? selectedClient.preferences.map((pref, i) => (
                      <span key={i} style={{
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        background: 'var(--tg-theme-secondary-bg-color)'
                      }}>
                        {pref}
                      </span>
                    )) : <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>Не указаны</span>}
                  </div>
                </div>

                {/* Allergies */}
                {selectedClient.allergies.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <IconAlertTriangle size={14} color="#f44336" />
                      <span style={{ fontSize: 13, color: '#f44336' }}>Аллергии</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {selectedClient.allergies.map((allergy, i) => (
                        <span key={i} style={{
                          padding: '4px 10px',
                          borderRadius: 12,
                          fontSize: 12,
                          background: '#ffebee',
                          color: '#f44336'
                        }}>
                          {allergy}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Birth Date */}
                {selectedClient.birthDate && (
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>День рождения</div>
                    <div style={{ fontSize: 14 }}>{selectedClient.birthDate}</div>
                  </div>
                )}

                {/* Source */}
                <div>
                  <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>Источник</div>
                  <div style={{ fontSize: 14 }}>
                    {selectedClient.source === 'telegram' ? 'Telegram' : 
                     selectedClient.source === 'instagram' ? 'Instagram' :
                     selectedClient.source === 'referral' ? 'По рекомендации' :
                     selectedClient.source === 'walk-in' ? 'Проходил мимо' : 'Другое'}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MOCK_VISITS.map(visit => (
                  <div key={visit.id} style={{
                    padding: 12,
                    background: 'var(--tg-theme-secondary-bg-color)',
                    borderRadius: 10
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>{visit.service}</span>
                      <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>{visit.date}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>Мастер: {visit.master}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: '#4CAF50' }}>{formatMoney(visit.price)}</span>
                        {visit.rating && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <span style={{ color: '#FFD700' }}>
                              <IconStar size={12} />
                            </span>
                            {visit.rating}
                          </span>
                        )}
                      </div>
                    </div>
                    {visit.notes && (
                      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                        {visit.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'notes' && (
              <div>
                <div style={{
                  padding: 14,
                  background: '#fff9c4',
                  borderRadius: 10,
                  fontSize: 14,
                  lineHeight: 1.5
                }}>
                  {selectedClient.notes || 'Заметок пока нет'}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <Button variant="secondary" fullWidth onClick={() => openEdit(selectedClient)}>
                <IconEdit size={16} /> Редактировать
              </Button>
              <Button fullWidth onClick={() => navigate(`/chat?client=${selectedClient.id}`)}>
                <IconMessage size={16} /> Написать
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
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
          zIndex: 1001,
          padding: 20
        }}>
          <Card style={{ width: '100%', maxWidth: 450, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>Редактировать клиента</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <IconX size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Имя</label>
                <input
                  type="text"
                  className="input"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Phone */}
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Телефон</label>
                <input
                  type="tel"
                  className="input"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Birth Date */}
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>День рождения</label>
                <input
                  type="text"
                  className="input"
                  value={editForm.birthDate || ''}
                  onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                  placeholder="ДД.ММ.ГГГГ"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Tags */}
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Теги</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CLIENT_TAGS.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 12,
                        border: 'none',
                        background: (editForm.tags || []).includes(tag.id) ? tag.color : 'var(--tg-theme-secondary-bg-color)',
                        color: (editForm.tags || []).includes(tag.id) ? '#fff' : 'var(--tg-theme-text-color)',
                        fontSize: 13,
                        cursor: 'pointer'
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferences */}
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Предпочтения</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PREFERENCE_OPTIONS.map(pref => (
                    <button
                      key={pref}
                      onClick={() => togglePreference(pref)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 10,
                        border: (editForm.preferences || []).includes(pref) ? 'none' : '1px solid var(--tg-theme-hint-color)',
                        background: (editForm.preferences || []).includes(pref) ? 'var(--tg-theme-button-color)' : 'transparent',
                        color: (editForm.preferences || []).includes(pref) ? '#fff' : 'var(--tg-theme-text-color)',
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allergies */}
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Аллергии</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ALLERGY_OPTIONS.map(allergy => (
                    <button
                      key={allergy}
                      onClick={() => toggleAllergy(allergy)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 10,
                        border: (editForm.allergies || []).includes(allergy) ? 'none' : '1px solid #f44336',
                        background: (editForm.allergies || []).includes(allergy) ? '#f44336' : 'transparent',
                        color: (editForm.allergies || []).includes(allergy) ? '#fff' : '#f44336',
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      {allergy}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Заметки</label>
                <textarea
                  className="input"
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  style={{ width: '100%', minHeight: 80 }}
                />
              </div>

              {/* VIP Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="isVip"
                  checked={editForm.isVip}
                  onChange={(e) => setEditForm({ ...editForm, isVip: e.target.checked })}
                  style={{ width: 20, height: 20, cursor: 'pointer' }}
                />
                <label htmlFor="isVip" style={{ fontSize: 14, cursor: 'pointer' }}>
                  VIP клиент 👑
                </label>
              </div>

              <Button onClick={saveEdit} fullWidth>
                Сохранить изменения
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
