import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../services/haptic';
import Card from '../components/Card';
import Button from '../components/Button';
import { 
  IconChevronLeft, IconTrendingUp, IconTrendingDown, IconDownload
} from '../components/Icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface FinancialStats {
  cashBalance: number; // Остаток в кассе
  todayRevenue: number; // Выручка сегодня
  weekRevenue: number; // Выручка неделя
  monthRevenue: number; // Выручка месяц
  todayExpenses: number; // Расходы сегодня
  weekExpenses: number; // Расходы неделя
  monthExpenses: number; // Расходы месяц
  pendingPayments: number; // К выплате мастерам
}

interface DailyData {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

const MOCK_STATS: FinancialStats = {
  cashBalance: 45000,
  todayRevenue: 12500,
  weekRevenue: 87500,
  monthRevenue: 345000,
  todayExpenses: 3500,
  weekExpenses: 24500,
  monthExpenses: 98000,
  pendingPayments: 42000,
};

const MOCK_DAILY_DATA: DailyData[] = [
  { date: 'Пн', revenue: 15000, expenses: 5000, profit: 10000 },
  { date: 'Вт', revenue: 18000, expenses: 4000, profit: 14000 },
  { date: 'Ср', revenue: 12000, expenses: 3500, profit: 8500 },
  { date: 'Чт', revenue: 22000, expenses: 6000, profit: 16000 },
  { date: 'Пт', revenue: 25000, expenses: 5500, profit: 19500 },
  { date: 'Сб', revenue: 30000, expenses: 7000, profit: 23000 },
  { date: 'Вс', revenue: 28000, expenses: 6500, profit: 21500 },
];

const MOCK_REVENUE_CATEGORIES: CategoryData[] = [
  { name: 'Стрижки', value: 45000, color: '#4CAF50' },
  { name: 'Маникюр', value: 38000, color: '#2196F3' },
  { name: 'Макияж', value: 25000, color: '#FF9800' },
  { name: 'Массаж', value: 18000, color: '#9C27B0' },
  { name: 'Другое', value: 12000, color: '#607D8B' },
];

const MOCK_EXPENSE_CATEGORIES: CategoryData[] = [
  { name: 'Зарплаты', value: 55000, color: '#f44336' },
  { name: 'Аренда', value: 25000, color: '#FF5722' },
  { name: 'Материалы', value: 12000, color: '#795548' },
  { name: 'Коммунальные', value: 8000, color: '#607D8B' },
  { name: 'Другое', value: 5000, color: '#9E9E9E' },
];

export default function FinancialDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<FinancialStats>(MOCK_STATS);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashOperation, setCashOperation] = useState<'in' | 'out'>('in');
  const [cashAmount, setCashAmount] = useState('');
  const [cashComment, setCashComment] = useState('');

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount) + ' сом';
  };

  const handleCashOperation = () => {
    haptic.notification('success');
    const amount = parseInt(cashAmount) || 0;
    if (cashOperation === 'in') {
      setStats({ ...stats, cashBalance: stats.cashBalance + amount });
    } else {
      setStats({ ...stats, cashBalance: stats.cashBalance - amount });
    }
    setShowCashModal(false);
    setCashAmount('');
    setCashComment('');
  };

  const exportReport = () => {
    haptic.selection();
    // TODO: Export to CSV
    alert('Отчёт экспортирован');
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
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
          Финансы
        </h1>
        <button 
          onClick={exportReport}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
        >
          <IconDownload size={20} />
        </button>
      </div>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['day', 'week', 'month'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 12,
              border: 'none',
              background: period === p ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
              color: period === p ? '#fff' : 'var(--tg-theme-text-color)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : 'Месяц'}
          </button>
        ))}
      </div>

      {/* Cash Balance Card */}
      <Card elevated style={{ marginBottom: 16, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 4 }}>Остаток в кассе</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{formatMoney(stats.cashBalance)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setCashOperation('in'); setShowCashModal(true); }}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              + Приход
            </button>
            <button
              onClick={() => { setCashOperation('out'); setShowCashModal(true); }}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              − Расход
            </button>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <IconTrendingUp size={18} color="#4CAF50" />
            <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>Выручка</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {formatMoney(period === 'day' ? stats.todayRevenue : period === 'week' ? stats.weekRevenue : stats.monthRevenue)}
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <IconTrendingDown size={18} color="#f44336" />
            <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>Расходы</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {formatMoney(period === 'day' ? stats.todayExpenses : period === 'week' ? stats.weekExpenses : stats.monthExpenses)}
          </div>
        </Card>
      </div>

      {/* Profit Card */}
      <Card style={{ marginBottom: 20, background: '#f8f9fa' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>Чистая прибыль</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#4CAF50' }}>
              {formatMoney(
                (period === 'day' ? stats.todayRevenue : period === 'week' ? stats.weekRevenue : stats.monthRevenue) -
                (period === 'day' ? stats.todayExpenses : period === 'week' ? stats.weekExpenses : stats.monthExpenses)
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>Рентабельность</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#4CAF50' }}>
              {((
                ((period === 'day' ? stats.todayRevenue : period === 'week' ? stats.weekRevenue : stats.monthRevenue) -
                (period === 'day' ? stats.todayExpenses : period === 'week' ? stats.weekExpenses : stats.monthExpenses)) /
                (period === 'day' ? stats.todayRevenue : period === 'week' ? stats.weekRevenue : stats.monthRevenue) * 100
              )).toFixed(1)}%
            </div>
          </div>
        </div>
      </Card>

      {/* Pending Payments */}
      <Card style={{ marginBottom: 20, border: '2px solid #FF9800' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>К выплате мастерам</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#FF9800' }}>{formatMoney(stats.pendingPayments)}</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/payroll')}>
            Расчёт зарплат
          </Button>
        </div>
      </Card>

      {/* Revenue/Expenses Chart */}
      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, marginBottom: 12 }}>Динамика</h3>
      <Card style={{ marginBottom: 20, padding: 16 }}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={MOCK_DAILY_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value: number) => formatMoney(value)}
              contentStyle={{ borderRadius: 8 }}
            />
            <Bar dataKey="revenue" fill="#4CAF50" radius={[4, 4, 0, 0]} name="Выручка" />
            <Bar dataKey="expenses" fill="#f44336" radius={[4, 4, 0, 0]} name="Расходы" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Categories */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 16, marginBottom: 12 }}>Выручка по услугам</h3>
          <Card style={{ padding: 12 }}>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={MOCK_REVENUE_CATEGORIES}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  dataKey="value"
                >
                  {MOCK_REVENUE_CATEGORIES.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatMoney(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {MOCK_REVENUE_CATEGORIES.map(cat => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: cat.color }} />
                  <span style={{ fontSize: 12, flex: 1 }}>{cat.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{formatMoney(cat.value)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 16, marginBottom: 12 }}>Расходы</h3>
          <Card style={{ padding: 12 }}>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={MOCK_EXPENSE_CATEGORIES}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  dataKey="value"
                >
                  {MOCK_EXPENSE_CATEGORIES.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatMoney(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {MOCK_EXPENSE_CATEGORIES.map(cat => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: cat.color }} />
                  <span style={{ fontSize: 12, flex: 1 }}>{cat.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{formatMoney(cat.value)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <Button variant="secondary" fullWidth onClick={() => navigate('/expenses')}>
          Управление расходами
        </Button>
        <Button variant="secondary" fullWidth onClick={() => navigate('/payroll')}>
          Расчёт зарплат
        </Button>
      </div>

      {/* Cash Operation Modal */}
      {showCashModal && (
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
          <Card style={{ width: '100%', maxWidth: 360 }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: 20 }}>
              {cashOperation === 'in' ? 'Приход в кассу' : 'Расход из кассы'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Сумма</label>
                <input
                  type="number"
                  className="input"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="0"
                  style={{ width: '100%', fontSize: 20 }}
                  autoFocus
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Комментарий</label>
                <input
                  type="text"
                  className="input"
                  value={cashComment}
                  onChange={(e) => setCashComment(e.target.value)}
                  placeholder="Например: Оплата аренды"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Button 
                  variant="ghost" 
                  fullWidth 
                  onClick={() => setShowCashModal(false)}
                >
                  Отмена
                </Button>
                <Button 
                  fullWidth 
                  onClick={handleCashOperation}
                  disabled={!cashAmount}
                >
                  {cashOperation === 'in' ? 'Принять' : 'Списать'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
