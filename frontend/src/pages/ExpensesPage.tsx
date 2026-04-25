import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../services/haptic';
import Card from '../components/Card';
import Button from '../components/Button';
import { 
  IconChevronLeft, IconPlus, IconX, IconHome, IconScissors, IconZap, IconTruck, IconMoreHorizontal
} from '../components/Icons';

interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  paymentMethod: 'cash' | 'card' | 'transfer';
}

const EXPENSE_CATEGORIES = [
  { id: 'salary', name: 'Зарплаты', icon: IconScissors, color: '#f44336' },
  { id: 'rent', name: 'Аренда', icon: IconHome, color: '#FF5722' },
  { id: 'materials', name: 'Материалы', icon: IconScissors, color: '#795548' },
  { id: 'utilities', name: 'Коммунальные', icon: IconZap, color: '#607D8B' },
  { id: 'delivery', name: 'Доставка', icon: IconTruck, color: '#9E9E9E' },
  { id: 'other', name: 'Другое', icon: IconMoreHorizontal, color: '#9C27B0' },
];

const MOCK_EXPENSES: Expense[] = [
  { id: '1', date: '25.04.2026', category: 'salary', amount: 15000, description: 'Зарплата Айгуль', paymentMethod: 'cash' },
  { id: '2', date: '24.04.2026', category: 'rent', amount: 25000, description: 'Аренда апрель', paymentMethod: 'transfer' },
  { id: '3', date: '23.04.2026', category: 'materials', amount: 3500, description: 'Краска для волос', paymentMethod: 'card' },
  { id: '4', date: '22.04.2026', category: 'utilities', amount: 4500, description: 'Электричество', paymentMethod: 'card' },
  { id: '5', date: '21.04.2026', category: 'materials', amount: 2800, description: 'Лаки для ногтей', paymentMethod: 'cash' },
];

export default function ExpensesPage() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>(MOCK_EXPENSES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    paymentMethod: 'cash' as 'cash' | 'card' | 'transfer',
  });

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount) + ' сом';
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const expensesByCategory = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    amount: expenses.filter(e => e.category === cat.id).reduce((sum, e) => sum + e.amount, 0),
  })).sort((a, b) => b.amount - a.amount);

  const handleAddExpense = () => {
    haptic.notification('success');
    const newExpense: Expense = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('ru-RU'),
      category: selectedCategory,
      amount: parseInt(formData.amount) || 0,
      description: formData.description,
      paymentMethod: formData.paymentMethod,
    };
    setExpenses([newExpense, ...expenses]);
    setShowAddModal(false);
    setFormData({ amount: '', description: '', paymentMethod: 'cash' });
    setSelectedCategory('');
  };

  const handleDelete = (id: string) => {
    haptic.notification('error');
    if (confirm('Удалить расход?')) {
      setExpenses(expenses.filter(e => e.id !== id));
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <button 
          onClick={() => navigate('/financial-dashboard')} 
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
          Расходы
        </h1>
        <Button onClick={() => setShowAddModal(true)} size="sm">
          <IconPlus size={18} />
        </Button>
      </div>

      {/* Total */}
      <Card elevated style={{ marginBottom: 20, background: '#f44336', color: '#fff' }}>
        <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 4 }}>Общие расходы</div>
        <div style={{ fontSize: 28, fontWeight: 700 }}>{formatMoney(totalExpenses)}</div>
      </Card>

      {/* By Category */}
      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, marginBottom: 12 }}>По категориям</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {expensesByCategory.filter(c => c.amount > 0).map(cat => {
          const Icon = cat.icon;
          const percentage = (cat.amount / totalExpenses) * 100;
          return (
            <Card key={cat.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: cat.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff'
                }}>
                  <Icon size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{cat.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                    {percentage.toFixed(1)}% от общих
                  </div>
                </div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{formatMoney(cat.amount)}</div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Expenses */}
      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, marginBottom: 12 }}>Последние расходы</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {expenses.map(expense => {
          const cat = EXPENSE_CATEGORIES.find(c => c.id === expense.category);
          const Icon = cat?.icon || IconMoreHorizontal;
          return (
            <Card key={expense.id}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: cat?.color || '#9C27B0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0
                }}>
                  <Icon size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{expense.description}</div>
                  <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                    {expense.date} • {cat?.name} • {expense.paymentMethod === 'cash' ? 'Наличные' : expense.paymentMethod === 'card' ? 'Карта' : 'Перевод'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontWeight: 600 }}>{formatMoney(expense.amount)}</div>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      color: '#f44336'
                    }}
                  >
                    <IconX size={18} />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

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
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>Новый расход</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <IconX size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Category */}
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 8 }}>Категория</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {EXPENSE_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 12,
                          border: isSelected ? 'none' : '1px solid var(--tg-theme-hint-color)',
                          background: isSelected ? cat.color : 'transparent',
                          color: isSelected ? '#fff' : 'var(--tg-theme-text-color)',
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Icon size={14} />
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Сумма</label>
                <input
                  type="number"
                  className="input"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                  style={{ width: '100%', fontSize: 20 }}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Описание</label>
                <input
                  type="text"
                  className="input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Например: Аренда за апрель"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Payment Method */}
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Способ оплаты</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { id: 'cash', name: 'Наличные' },
                    { id: 'card', name: 'Карта' },
                    { id: 'transfer', name: 'Перевод' },
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => setFormData({ ...formData, paymentMethod: method.id as any })}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: formData.paymentMethod === method.id ? 'none' : '1px solid var(--tg-theme-hint-color)',
                        background: formData.paymentMethod === method.id ? 'var(--tg-theme-button-color)' : 'transparent',
                        color: formData.paymentMethod === method.id ? '#fff' : 'var(--tg-theme-text-color)',
                        fontSize: 13,
                        cursor: 'pointer'
                      }}
                    >
                      {method.name}
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleAddExpense} 
                fullWidth 
                disabled={!selectedCategory || !formData.amount}
              >
                Добавить расход
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
