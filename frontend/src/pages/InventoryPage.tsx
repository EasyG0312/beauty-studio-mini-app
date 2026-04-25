import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../services/haptic';
import Card from '../components/Card';
import Button from '../components/Button';
import { 
  IconChevronLeft, IconPlus, IconX, IconAlertTriangle,
  IconPackage, IconMinus
} from '../components/Icons';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number; // минимальный остаток
  unit: string; // шт, мл, г, упаковка
  supplier?: string;
  lastRestocked?: string;
  pricePerUnit: number;
  location?: string; // где хранится
  notes?: string;
}

// interface StockMovement {
//   id: string;
//   itemId: string;
//   type: 'in' | 'out' | 'adjustment';
//   quantity: number;
//   date: string;
//   reason: string;
//   user: string;
// }

const INVENTORY_CATEGORIES = [
  { id: 'hair_color', name: 'Краска для волос', color: '#9C27B0' },
  { id: 'nail_polish', name: 'Лаки/гель-лаки', color: '#2196F3' },
  { id: 'tools', name: 'Инструменты', color: '#4CAF50' },
  { id: 'consumables', name: 'Расходники', color: '#FF9800' },
  { id: 'care', name: 'Уход', color: '#795548' },
  { id: 'other', name: 'Другое', color: '#607D8B' },
];

const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: '1',
    name: 'Краска Wella 6/0',
    category: 'hair_color',
    currentStock: 3,
    minStock: 5,
    unit: 'шт',
    supplier: 'ООО "Бьюти Снаб"',
    lastRestocked: '15.04.2026',
    pricePerUnit: 450,
    location: 'Шкаф красок',
    notes: 'Тёмный блонд',
  },
  {
    id: '2',
    name: 'Гель-лак Kodi #123',
    category: 'nail_polish',
    currentStock: 12,
    minStock: 3,
    unit: 'шт',
    supplier: 'NailSupply.kg',
    lastRestocked: '20.04.2026',
    pricePerUnit: 280,
    location: 'Полка маникюр',
  },
  {
    id: '3',
    name: 'Перчатки латексные',
    category: 'consumables',
    currentStock: 2,
    minStock: 10,
    unit: 'упак',
    supplier: 'МедСнаб',
    lastRestocked: '10.04.2026',
    pricePerUnit: 150,
    location: 'Стол массаж',
    notes: 'Размер M',
  },
  {
    id: '4',
    name: 'Шампунь L\'Oreal',
    category: 'care',
    currentStock: 8,
    minStock: 5,
    unit: 'шт',
    supplier: 'ООО "Бьюти Снаб"',
    lastRestocked: '18.04.2026',
    pricePerUnit: 320,
    location: 'Шкаф умывальник',
  },
  {
    id: '5',
    name: 'Ножницы прямые',
    category: 'tools',
    currentStock: 1,
    minStock: 2,
    unit: 'шт',
    pricePerUnit: 2500,
    location: 'Шкаф мастеров',
    notes: 'Для стрижки',
  },
];

// const MOCK_MOVEMENTS: StockMovement[] = [
//   { id: '1', itemId: '1', type: 'out', quantity: 1, date: '25.04.2026', reason: 'Использовано Айгуль', user: 'Айгуль' },
//   { id: '2', itemId: '2', type: 'in', quantity: 10, date: '20.04.2026', reason: 'Закупка', user: 'Владелец' },
//   { id: '3', itemId: '3', type: 'out', quantity: 1, date: '18.04.2026', reason: 'Использовано Диана', user: 'Диана' },
// ];

export default function InventoryPage() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<InventoryItem[]>(MOCK_INVENTORY);
  const [filter, setFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    category: 'hair_color',
    unit: 'шт',
    minStock: 5,
  });
  const [stockData, setStockData] = useState({
    type: 'in' as 'in' | 'out',
    quantity: '',
    reason: '',
  });

  const filteredInventory = filter === 'all' 
    ? inventory 
    : filter === 'low'
      ? inventory.filter(item => item.currentStock <= item.minStock)
      : inventory.filter(item => item.category === filter);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount) + ' сом';
  };

  const isLowStock = (item: InventoryItem) => item.currentStock <= item.minStock;

  const handleSave = () => {
    haptic.notification('success');
    const newItem: InventoryItem = {
      id: Date.now().toString(),
      name: formData.name || '',
      category: formData.category || 'other',
      currentStock: formData.currentStock || 0,
      minStock: formData.minStock || 5,
      unit: formData.unit || 'шт',
      supplier: formData.supplier,
      pricePerUnit: formData.pricePerUnit || 0,
      location: formData.location,
      notes: formData.notes,
    };
    setInventory([...inventory, newItem]);
    setShowAddModal(false);
    setFormData({ category: 'hair_color', unit: 'шт', minStock: 5 });
  };

  const handleStockUpdate = () => {
    haptic.notification('success');
    if (selectedItem) {
      const qty = parseInt(stockData.quantity) || 0;
      const newStock = stockData.type === 'in' 
        ? selectedItem.currentStock + qty 
        : selectedItem.currentStock - qty;
      
      setInventory(inventory.map(item => 
        item.id === selectedItem.id 
          ? { ...item, currentStock: newStock, lastRestocked: new Date().toLocaleDateString('ru-RU') }
          : item
      ));
    }
    setShowStockModal(false);
    setStockData({ type: 'in', quantity: '', reason: '' });
  };

  const openStockModal = (item: InventoryItem, type: 'in' | 'out') => {
    setSelectedItem(item);
    setStockData({ type, quantity: '', reason: '' });
    setShowStockModal(true);
  };

  const lowStockCount = inventory.filter(isLowStock).length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.currentStock * item.pricePerUnit), 0);

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
          Склад
        </h1>
        <Button onClick={() => setShowAddModal(true)} size="sm">
          <IconPlus size={18} />
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
        <Card elevated style={{ background: lowStockCount > 0 ? '#f44336' : '#4CAF50', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <IconAlertTriangle size={18} />
            <span style={{ fontSize: 12, opacity: 0.9 }}>Заканчивается</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{lowStockCount} позиций</div>
        </Card>
        <Card elevated style={{ background: '#2196F3', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <IconPackage size={18} />
            <span style={{ fontSize: 12, opacity: 0.9 }}>На складе</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{formatMoney(totalValue)}</div>
        </Card>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
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
        <button
          onClick={() => setFilter('low')}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            border: 'none',
            background: filter === 'low' ? '#f44336' : 'var(--tg-theme-secondary-bg-color)',
            color: filter === 'low' ? '#fff' : 'var(--tg-theme-text-color)',
            fontSize: 13,
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <IconAlertTriangle size={14} />
          Заканчивается
        </button>
        {INVENTORY_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
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

      {/* Inventory List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredInventory.map(item => {
          const category = INVENTORY_CATEGORIES.find(c => c.id === item.category);
          const low = isLowStock(item);
          
          return (
            <Card key={item.id}>
              <div style={{ display: 'flex', gap: 12 }}>
                {/* Category color */}
                <div style={{
                  width: 6,
                  borderRadius: 3,
                  background: low ? '#f44336' : (category?.color || '#607D8B'),
                  flexShrink: 0
                }} />
                
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {item.name}
                        {low && <span style={{ fontSize: 16 }}>⚠️</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                        {category?.name} • {item.location}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>
                        {item.currentStock} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--tg-theme-hint-color)' }}>{item.unit}</span>
                      </div>
                      <div style={{ fontSize: 12, color: low ? '#f44336' : 'var(--tg-theme-hint-color)' }}>
                        мин: {item.minStock}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                      {formatMoney(item.pricePerUnit)}/ед • {item.supplier || 'Без поставщика'}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => openStockModal(item, 'out')}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#ffebee',
                          color: '#f44336',
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <IconMinus size={14} />
                        Расход
                      </button>
                      <button
                        onClick={() => openStockModal(item, 'in')}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#e8f5e9',
                          color: '#4CAF50',
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <IconPlus size={14} />
                        Приход
                      </button>
                    </div>
                  </div>

                  {item.notes && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                      {item.notes}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredInventory.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <div style={{ fontSize: 16, color: 'var(--tg-theme-hint-color)' }}>
            Позиции не найдены
          </div>
        </Card>
      )}

      {/* Add Modal */}
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
          <Card style={{ width: '100%', maxWidth: 400, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>Новая позиция</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <IconX size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Название</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%' }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Категория</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {INVENTORY_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setFormData({ ...formData, category: cat.id })}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: 'none',
                        background: formData.category === cat.id ? cat.color : 'var(--tg-theme-secondary-bg-color)',
                        color: formData.category === cat.id ? '#fff' : 'var(--tg-theme-text-color)',
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Остаток</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.currentStock || ''}
                    onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Мин. остаток</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.minStock || ''}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Ед. изм.</label>
                  <select
                    className="input"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="шт">шт</option>
                    <option value="мл">мл</option>
                    <option value="г">г</option>
                    <option value="упак">упаковка</option>
                    <option value="пара">пара</option>
                    <option value="рулон">рулон</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Цена за ед.</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.pricePerUnit || ''}
                    onChange={(e) => setFormData({ ...formData, pricePerUnit: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Поставщик</label>
                <input
                  type="text"
                  className="input"
                  value={formData.supplier || ''}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Место хранения</label>
                <input
                  type="text"
                  className="input"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Примечания</label>
                <textarea
                  className="input"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{ width: '100%', minHeight: 60 }}
                />
              </div>

              <Button onClick={handleSave} fullWidth disabled={!formData.name}>
                Добавить позицию
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Stock Update Modal */}
      {showStockModal && selectedItem && (
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
          <Card style={{ width: '100%', maxWidth: 360 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>
                {stockData.type === 'in' ? 'Приход' : 'Расход'}: {selectedItem.name}
              </h3>
              <button onClick={() => setShowStockModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <IconX size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>
                  Количество ({selectedItem.unit})
                </label>
                <input
                  type="number"
                  className="input"
                  value={stockData.quantity}
                  onChange={(e) => setStockData({ ...stockData, quantity: e.target.value })}
                  style={{ width: '100%', fontSize: 20 }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Причина / Примечание</label>
                <input
                  type="text"
                  className="input"
                  value={stockData.reason}
                  onChange={(e) => setStockData({ ...stockData, reason: e.target.value })}
                  placeholder={stockData.type === 'in' ? 'Например: Закупка' : 'Например: Использовано Диана'}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ padding: 12, background: 'var(--tg-theme-secondary-bg-color)', borderRadius: 10 }}>
                <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>Текущий остаток</div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>
                  {selectedItem.currentStock} {selectedItem.unit}
                </div>
              </div>

              <Button 
                onClick={handleStockUpdate} 
                fullWidth 
                disabled={!stockData.quantity}
                style={{
                  background: stockData.type === 'in' ? '#4CAF50' : '#f44336'
                }}
              >
                {stockData.type === 'in' ? '✓ Принять на склад' : '✓ Списать'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
