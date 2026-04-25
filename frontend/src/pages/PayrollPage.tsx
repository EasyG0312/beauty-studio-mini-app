import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../services/haptic';
import Card from '../components/Card';
import Button from '../components/Button';
import { 
  IconChevronLeft, IconCheck, IconX
} from '../components/Icons';

interface PayrollRecord {
  id: string;
  masterId: string;
  masterName: string;
  period: string;
  baseAmount: number; // Выручка мастера
  commissionRate: number; // % комиссии
  commission: number; // Зарплата
  bonuses: number; // Премии
  penalties: number; // Штрафы
  total: number; // Итого к выплате
  status: 'pending' | 'paid';
  paidAt?: string;
}

const MOCK_PAYROLL: PayrollRecord[] = [
  {
    id: '1',
    masterId: '1',
    masterName: 'Айгуль',
    period: '01-25.04.2026',
    baseAmount: 65000,
    commissionRate: 40,
    commission: 26000,
    bonuses: 2000,
    penalties: 0,
    total: 28000,
    status: 'pending',
  },
  {
    id: '2',
    masterId: '2',
    masterName: 'Диана',
    period: '01-25.04.2026',
    baseAmount: 52000,
    commissionRate: 35,
    commission: 18200,
    bonuses: 0,
    penalties: 1000,
    total: 17200,
    status: 'pending',
  },
  {
    id: '3',
    masterId: '3',
    masterName: 'Айгерим',
    period: '01-25.04.2026',
    baseAmount: 48000,
    commissionRate: 45,
    commission: 21600,
    bonuses: 1500,
    penalties: 0,
    total: 23100,
    status: 'paid',
    paidAt: '25.04.2026',
  },
];

export default function PayrollPage() {
  const navigate = useNavigate();
  const [payroll, setPayroll] = useState<PayrollRecord[]>(MOCK_PAYROLL);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddBonusModal, setShowAddBonusModal] = useState(false);
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusReason, setBonusReason] = useState('');

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount) + ' сом';
  };

  const totalPending = payroll.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.total, 0);
  const totalPaid = payroll.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.total, 0);

  const handlePay = (recordId: string) => {
    haptic.notification('success');
    setPayroll(payroll.map(p => 
      p.id === recordId 
        ? { ...p, status: 'paid', paidAt: new Date().toLocaleDateString('ru-RU') }
        : p
    ));
  };

  const handleAddBonus = () => {
    haptic.notification('success');
    if (selectedRecord) {
      const bonus = parseInt(bonusAmount) || 0;
      setPayroll(payroll.map(p => 
        p.id === selectedRecord.id 
          ? { ...p, bonuses: p.bonuses + bonus, total: p.total + bonus }
          : p
      ));
    }
    setShowAddBonusModal(false);
    setBonusAmount('');
    setBonusReason('');
  };

  const openDetail = (record: PayrollRecord) => {
    haptic.selection();
    setSelectedRecord(record);
    setShowDetailModal(true);
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
          Расчёт зарплат
        </h1>
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

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
        <Card elevated style={{ background: '#FF9800', color: '#fff' }}>
          <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>К выплате</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{formatMoney(totalPending)}</div>
        </Card>
        <Card elevated style={{ background: '#4CAF50', color: '#fff' }}>
          <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>Выплачено</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{formatMoney(totalPaid)}</div>
        </Card>
      </div>

      {/* Payroll List */}
      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, marginBottom: 12 }}>Мастера</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {payroll.map(record => (
          <Card 
            key={record.id} 
            onClick={() => openDetail(record)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Avatar */}
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                background: record.status === 'paid' 
                  ? 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)' 
                  : 'linear-gradient(135deg, #FF9800 0%, #FFC107 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 18,
                fontWeight: 600,
                flexShrink: 0
              }}>
                {record.masterName.charAt(0)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{record.masterName}</span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontSize: 11,
                    background: record.status === 'paid' ? '#4CAF50' : '#FF9800',
                    color: '#fff'
                  }}>
                    {record.status === 'paid' ? 'Выплачено' : 'Ожидает'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                  {record.period} • Комиссия {record.commissionRate}%
                </div>
              </div>

              {/* Amount */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{formatMoney(record.total)}</div>
                {record.bonuses > 0 && (
                  <div style={{ fontSize: 11, color: '#4CAF50' }}>+{formatMoney(record.bonuses)} премия</div>
                )}
                {record.penalties > 0 && (
                  <div style={{ fontSize: 11, color: '#f44336' }}>-{formatMoney(record.penalties)} штраф</div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
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
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>Детали расчёта</h3>
              <button 
                onClick={() => setShowDetailModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <IconX size={24} />
              </button>
            </div>

            {/* Master Info */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12, 
              marginBottom: 20,
              padding: 16,
              background: 'var(--tg-theme-secondary-bg-color)',
              borderRadius: 12
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 24,
                fontWeight: 600
              }}>
                {selectedRecord.masterName.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 18 }}>{selectedRecord.masterName}</div>
                <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
                  Период: {selectedRecord.period}
                </div>
              </div>
            </div>

            {/* Calculation */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tg-theme-hint-color)' }}>
                <span style={{ color: 'var(--tg-theme-hint-color)' }}>Выручка мастера</span>
                <span style={{ fontWeight: 500 }}>{formatMoney(selectedRecord.baseAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tg-theme-hint-color)' }}>
                <span style={{ color: 'var(--tg-theme-hint-color)' }}>Комиссия ({selectedRecord.commissionRate}%)</span>
                <span style={{ fontWeight: 500 }}>{formatMoney(selectedRecord.commission)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tg-theme-hint-color)' }}>
                <span style={{ color: '#4CAF50' }}>Премии</span>
                <span style={{ fontWeight: 500, color: '#4CAF50' }}>+{formatMoney(selectedRecord.bonuses)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--tg-theme-hint-color)' }}>
                <span style={{ color: '#f44336' }}>Штрафы</span>
                <span style={{ fontWeight: 500, color: '#f44336' }}>-{formatMoney(selectedRecord.penalties)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', marginTop: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>ИТОГО К ВЫПЛАТЕ</span>
                <span style={{ fontWeight: 700, fontSize: 20, color: selectedRecord.status === 'paid' ? '#4CAF50' : '#FF9800' }}>
                  {formatMoney(selectedRecord.total)}
                </span>
              </div>
            </div>

            {/* Actions */}
            {selectedRecord.status === 'pending' ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <Button 
                  variant="secondary" 
                  fullWidth 
                  onClick={() => { setShowDetailModal(false); setShowAddBonusModal(true); }}
                >
                  + Премия/штраф
                </Button>
                <Button 
                  fullWidth 
                  onClick={() => { handlePay(selectedRecord.id); setShowDetailModal(false); }}
                >
                  Выплатить
                </Button>
              </div>
            ) : (
              <div style={{ 
                padding: 12, 
                background: '#4CAF50', 
                color: '#fff', 
                borderRadius: 10,
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginRight: 8 }}>
                  <IconCheck size={20} />
                </div>
                Выплачено {selectedRecord.paidAt}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Add Bonus Modal */}
      {showAddBonusModal && selectedRecord && (
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
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>Премия или штраф</h3>
              <button 
                onClick={() => setShowAddBonusModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <IconX size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Сумма</label>
                <input
                  type="number"
                  className="input"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                  placeholder="0"
                  style={{ width: '100%', fontSize: 20 }}
                  autoFocus
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Причина</label>
                <input
                  type="text"
                  className="input"
                  value={bonusReason}
                  onChange={(e) => setBonusReason(e.target.value)}
                  placeholder="Например: За отличные отзывы"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Button 
                  variant="ghost" 
                  fullWidth 
                  onClick={() => setShowAddBonusModal(false)}
                >
                  Отмена
                </Button>
                <Button 
                  fullWidth 
                  onClick={handleAddBonus}
                  disabled={!bonusAmount}
                >
                  Добавить
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
