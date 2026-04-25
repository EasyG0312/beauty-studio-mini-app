import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import { 
  IconChevronLeft, IconCalendar, IconUser,
  IconMessage, IconPlus, IconX, IconEdit,
  IconCheck, IconDollar
} from '../components/Icons';

interface ActivityRecord {
  id: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    role: 'owner' | 'manager' | 'master' | 'client';
  };
  action: 'booking_created' | 'booking_cancelled' | 'booking_completed' | 
          'booking_arrived' | 'client_registered' | 'client_updated' |
          'master_added' | 'master_updated' | 'service_updated' |
          'payment_received' | 'expense_added' | 'salary_paid' |
          'review_added' | 'chat_message';
  entity: {
    type: 'booking' | 'client' | 'master' | 'service' | 'expense' | 'payment';
    id: string;
    name: string;
  };
  details?: string;
  metadata?: Record<string, any>;
}

const ACTIVITY_ICONS: Record<ActivityRecord['action'], typeof IconPlus> = {
  booking_created: IconCalendar,
  booking_cancelled: IconX,
  booking_completed: IconCheck,
  booking_arrived: IconUser,
  client_registered: IconUser,
  client_updated: IconEdit,
  master_added: IconPlus,
  master_updated: IconEdit,
  service_updated: IconEdit,
  payment_received: IconDollar,
  expense_added: IconDollar,
  salary_paid: IconDollar,
  review_added: IconMessage,
  chat_message: IconMessage,
};

const ACTIVITY_COLORS: Record<ActivityRecord['action'], string> = {
  booking_created: '#4CAF50',
  booking_cancelled: '#f44336',
  booking_completed: '#2196F3',
  booking_arrived: '#9C27B0',
  client_registered: '#4CAF50',
  client_updated: '#FF9800',
  master_added: '#4CAF50',
  master_updated: '#FF9800',
  service_updated: '#607D8B',
  payment_received: '#4CAF50',
  expense_added: '#f44336',
  salary_paid: '#2196F3',
  review_added: '#FF9800',
  chat_message: '#607D8B',
};

const ACTIVITY_LABELS: Record<ActivityRecord['action'], string> = {
  booking_created: 'Новая запись',
  booking_cancelled: 'Отмена записи',
  booking_completed: 'Запись выполнена',
  booking_arrived: 'Клиент пришёл',
  client_registered: 'Новый клиент',
  client_updated: 'Клиент обновлён',
  master_added: 'Мастер добавлен',
  master_updated: 'Мастер обновлён',
  service_updated: 'Услуга обновлена',
  payment_received: 'Оплата получена',
  expense_added: 'Расход добавлен',
  salary_paid: 'Зарплата выплачена',
  review_added: 'Новый отзыв',
  chat_message: 'Сообщение в чате',
};

const MOCK_ACTIVITIES: ActivityRecord[] = [
  {
    id: '1',
    timestamp: '25.04.2026 16:45',
    user: { id: '1', name: 'Айгуль', role: 'master' },
    action: 'booking_completed',
    entity: { type: 'booking', id: '101', name: 'Айжан - Стрижка' },
    details: 'Услуга выполнена успешно',
  },
  {
    id: '2',
    timestamp: '25.04.2026 16:30',
    user: { id: '2', name: 'Система', role: 'manager' },
    action: 'booking_arrived',
    entity: { type: 'booking', id: '101', name: 'Айжан - Стрижка' },
    details: 'QR-код отсканирован',
  },
  {
    id: '3',
    timestamp: '25.04.2026 15:20',
    user: { id: '3', name: 'Владелец', role: 'owner' },
    action: 'expense_added',
    entity: { type: 'expense', id: '5', name: 'Краска для волос' },
    details: '3500 сом',
  },
  {
    id: '4',
    timestamp: '25.04.2026 14:10',
    user: { id: '4', name: 'Диана', role: 'master' },
    action: 'payment_received',
    entity: { type: 'payment', id: '202', name: 'Маникюр' },
    details: '2000 сом — наличные',
  },
  {
    id: '5',
    timestamp: '25.04.2026 13:00',
    user: { id: '5', name: 'Новый клиент', role: 'client' },
    action: 'booking_created',
    entity: { type: 'booking', id: '103', name: 'Мария - Макияж' },
    details: '27.04.2026 10:00',
  },
  {
    id: '6',
    timestamp: '25.04.2026 12:30',
    user: { id: '1', name: 'Айгуль', role: 'master' },
    action: 'review_added',
    entity: { type: 'booking', id: '99', name: 'Отзыв от Гульнара' },
    details: '5 звёзд',
  },
  {
    id: '7',
    timestamp: '25.04.2026 10:00',
    user: { id: '2', name: 'Владелец', role: 'owner' },
    action: 'salary_paid',
    entity: { type: 'payment', id: '301', name: 'Айгерим' },
    details: '23100 сом',
  },
  {
    id: '8',
    timestamp: '25.04.2026 09:45',
    user: { id: '6', name: 'Менеджер', role: 'manager' },
    action: 'client_registered',
    entity: { type: 'client', id: '45', name: 'Салтанат' },
    details: '+996 555 123 456',
  },
];

const FILTER_OPTIONS = [
  { id: 'all', label: 'Все' },
  { id: 'booking', label: 'Записи' },
  { id: 'payment', label: 'Финансы' },
  { id: 'client', label: 'Клиенты' },
  { id: 'master', label: 'Мастера' },
];

export default function ActivityLogPage() {
  const navigate = useNavigate();
  const [activities] = useState<ActivityRecord[]>(MOCK_ACTIVITIES);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredActivities = activities.filter(activity => {
    if (filter !== 'all' && activity.entity.type !== filter) return false;
    if (searchQuery && !activity.entity.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const groupedByDate = filteredActivities.reduce((groups, activity) => {
    const date = activity.timestamp.split(' ')[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, ActivityRecord[]>);

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
          Журнал событий
        </h1>
      </div>

      {/* Date Range */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'today', label: 'Сегодня' },
          { id: 'week', label: 'Неделя' },
          { id: 'month', label: 'Месяц' },
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => setDateRange(opt.id)}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: 'none',
              background: dateRange === opt.id ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
              color: dateRange === opt.id ? '#fff' : 'var(--tg-theme-text-color)',
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          className="input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по клиенту или событию..."
          style={{ width: '100%' }}
        />
      </div>

      {/* Filter Pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => setFilter(opt.id)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: filter === opt.id ? 'none' : '1px solid var(--tg-theme-hint-color)',
              background: filter === opt.id ? 'var(--tg-theme-button-color)' : 'transparent',
              color: filter === opt.id ? '#fff' : 'var(--tg-theme-text-color)',
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Activity List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Object.entries(groupedByDate).map(([date, items]) => (
          <div key={date}>
            <div style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: 'var(--tg-theme-hint-color)', 
              marginBottom: 10,
              paddingLeft: 4
            }}>
              {date === new Date().toLocaleDateString('ru-RU') ? 'Сегодня' : date}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(activity => {
                const Icon = ACTIVITY_ICONS[activity.action];
                const color = ACTIVITY_COLORS[activity.action];
                const label = ACTIVITY_LABELS[activity.action];
                
                return (
                  <Card key={activity.id}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {/* Icon */}
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: `${color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: color,
                        flexShrink: 0
                      }}>
                        <Icon size={20} />
                      </div>
                      
                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 8,
                              fontSize: 11,
                              background: `${color}20`,
                              color: color,
                              fontWeight: 500,
                              marginRight: 8
                            }}>
                              {label}
                            </span>
                            <span style={{ fontWeight: 600 }}>{activity.entity.name}</span>
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', flexShrink: 0 }}>
                            {activity.timestamp.split(' ')[1]}
                          </span>
                        </div>
                        
                        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--tg-theme-text-color)' }}>
                          {activity.details}
                        </div>
                        
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'var(--tg-theme-secondary-bg-color)',
                            fontSize: 11
                          }}>
                            {activity.user.role === 'owner' ? 'Владелец' : 
                             activity.user.role === 'manager' ? 'Менеджер' : 
                             activity.user.role === 'master' ? 'Мастер' : 'Клиент'}
                          </span>
                          <span>{activity.user.name}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {filteredActivities.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 16, color: 'var(--tg-theme-hint-color)' }}>
            Нет событий за выбранный период
          </div>
        </Card>
      )}
    </div>
  );
}
