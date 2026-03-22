import { useState, useEffect } from 'react';
import {
  getAnalyticsDashboard,
  getFunnelStats,
  getHeatmapData,
  getComparisonStats,
  getMasterKPI,
  getRFMSegments,
  exportAnalyticsCSV,
} from '../services/api';
import type {
  AnalyticsDashboard,
  FunnelStats,
  HourlyHeatmap,
  ComparisonStats,
  MasterKPI,
  ClientRFM,
} from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function AnalyticsDashboardPage() {
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [funnel, setFunnel] = useState<FunnelStats | null>(null);
  const [heatmap, setHeatmap] = useState<HourlyHeatmap[]>([]);
  const [comparison, setComparison] = useState<ComparisonStats | null>(null);
  const [masterKPI, setMasterKPI] = useState<MasterKPI[]>([]);
  const [rfm, setRfm] = useState<ClientRFM[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [tab, setTab] = useState<'overview' | 'funnel' | 'heatmap' | 'masters' | 'rfm'>('overview');

  useEffect(() => {
    loadAllData();
  }, [period]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        dashboardData,
        funnelData,
        heatmapData,
        comparisonData,
        masterKPIData,
        rfmData,
      ] = await Promise.all([
        getAnalyticsDashboard(period),
        getFunnelStats(period),
        getHeatmapData(period),
        getComparisonStats(period),
        getMasterKPI(),
        getRFMSegments(),
      ]);

      setDashboard(dashboardData);
      setFunnel(funnelData);
      setHeatmap(heatmapData);
      setComparison(comparisonData);
      setMasterKPI(masterKPIData);
      setRfm(rfmData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportAnalyticsCSV(period);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_${period}days.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert('Ошибка при экспорте');
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Загрузка аналитики...</div>
      </div>
    );
  }

  // Группировка RFM
  const rfmGroups = rfm.reduce((acc, client) => {
    const segment = client.rfm_segment;
    if (!acc[segment]) acc[segment] = [];
    acc[segment].push(client);
    return acc;
  }, {} as Record<string, ClientRFM[]>);

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1>Аналитика</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            className="input"
            value={period}
            onChange={(e) => setPeriod(parseInt(e.target.value))}
            style={{ width: 'auto' }}
          >
            <option value={7}>7 дней</option>
            <option value={30}>30 дней</option>
            <option value={90}>90 дней</option>
          </select>
          <Button onClick={handleExport} variant="secondary">
            📥 Экспорт
          </Button>
        </div>
      </div>

      {/* Comparison Stats */}
      {comparison && (
        <Card className="mb-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="text-hint">Сравнение с предыдущим периодом</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>
                {comparison.current_period.toLocaleString()} сом
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: comparison.trend === 'up' ? '#4CAF50' : comparison.trend === 'down' ? '#f44336' : '#9e9e9e',
              }}>
                {comparison.trend === 'up' ? '📈' : comparison.trend === 'down' ? '📉' : '➡️'}
                {comparison.change_percent > 0 ? '+' : ''}{comparison.change_percent}%
              </div>
              <div className="text-hint" style={{ fontSize: '12px' }}>
                Было: {comparison.previous_period.toLocaleString()} сом
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto' }}>
        <Button
          variant={tab === 'overview' ? 'primary' : 'secondary'}
          onClick={() => setTab('overview')}
          style={{ flex: 'none' }}
        >
          Обзор
        </Button>
        <Button
          variant={tab === 'funnel' ? 'primary' : 'secondary'}
          onClick={() => setTab('funnel')}
          style={{ flex: 'none' }}
        >
          Воронка
        </Button>
        <Button
          variant={tab === 'heatmap' ? 'primary' : 'secondary'}
          onClick={() => setTab('heatmap')}
          style={{ flex: 'none' }}
        >
          Тепловая карта
        </Button>
        <Button
          variant={tab === 'masters' ? 'primary' : 'secondary'}
          onClick={() => setTab('masters')}
          style={{ flex: 'none' }}
        >
          Мастера
        </Button>
        <Button
          variant={tab === 'rfm' ? 'primary' : 'secondary'}
          onClick={() => setTab('rfm')}
          style={{ flex: 'none' }}
        >
          RFM
        </Button>
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && dashboard && (
        <>
          {/* Key Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <Card>
              <div className="text-hint">Выручка</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {dashboard.total_revenue.toLocaleString()} сом
              </div>
            </Card>
            <Card>
              <div className="text-hint">Записи</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {dashboard.total_bookings}
              </div>
            </Card>
            <Card>
              <div className="text-hint">Конверсия</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {dashboard.conversion_rate}%
              </div>
            </Card>
            <Card>
              <div className="text-hint">Средний чек</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {dashboard.avg_check.toLocaleString()} сом
              </div>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card className="mb-3">
            <h3>Динамика выручки</h3>
            <div style={{ height: '300px', marginTop: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard.daily_stats.slice(0, 14)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Выручка" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Top Services */}
          <Card className="mb-3">
            <h3>Топ услуг</h3>
            <div style={{ height: '250px', marginTop: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.top_services}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" name="Количество" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Clients */}
          <Card>
            <h3>Клиенты</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '16px' }}>
              <div>
                <div className="text-hint">Новые</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4CAF50' }}>
                  {dashboard.new_clients}
                </div>
              </div>
              <div>
                <div className="text-hint">Возвращающиеся</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2196F3' }}>
                  {dashboard.returning_clients}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Funnel Tab */}
      {tab === 'funnel' && funnel && (
        <>
          <Card className="mb-3">
            <h3>Воронка конверсии</h3>
            <div style={{ height: '350px', marginTop: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Всего', value: funnel.total },
                    { name: 'Ожидают', value: funnel.pending },
                    { name: 'Подтверждено', value: funnel.confirmed },
                    { name: 'Завершено', value: funnel.completed },
                    { name: 'Отменено', value: funnel.cancelled },
                    { name: 'Не явились', value: funnel.no_show },
                  ]}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {funnel.total && [0, 1, 2, 3, 4, 5].map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--tg-theme-secondary-bg-color)', borderRadius: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                Конверсия: {funnel.conversion_rate}%
              </div>
              <div className="text-hint" style={{ fontSize: '13px', marginTop: '4px' }}>
                Из {funnel.total} записей завершено {funnel.completed}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Heatmap Tab */}
      {tab === 'heatmap' && (
        <Card>
          <h3>Тепловая карта загруженности</h3>
          <p className="text-hint" style={{ fontSize: '13px', marginTop: '8px' }}>
            Показывает самые загруженные дни и время
          </p>
          <div style={{ marginTop: '16px', overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(10, 1fr)', gap: '4px', minWidth: '600px' }}>
              {/* Header */}
              <div />
              {['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map((hour) => (
                <div key={hour} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600' }}>
                  {hour}
                </div>
              ))}

              {/* Rows */}
              {DAY_NAMES.map((dayName, dayIndex) => (
                <>
                  <div key={dayIndex} style={{ fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                    {dayName}
                  </div>
                  {['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map((hour) => {
                    const cell = heatmap.find((h) => h.day_of_week === dayIndex && h.hour === hour);
                    const utilization = cell?.utilization_percent || 0;
                    const intensity = Math.min(1, utilization / 100);
                    const color = `rgba(33, 150, 243, ${intensity})`;

                    return (
                      <div
                        key={`${dayIndex}-${hour}`}
                        style={{
                          background: color,
                          color: utilization > 50 ? 'white' : 'black',
                          padding: '8px 4px',
                          borderRadius: '4px',
                          textAlign: 'center',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}
                      >
                        {cell?.bookings_count || 0}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Masters Tab */}
      {tab === 'masters' && masterKPI.length > 0 && (
        <>
          {masterKPI.map((master) => (
            <Card key={master.master} className="mb-2">
              <h3>{master.master}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '12px' }}>
                <div>
                  <div className="text-hint" style={{ fontSize: '12px' }}>Завершено</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{master.completed}</div>
                </div>
                <div>
                  <div className="text-hint" style={{ fontSize: '12px' }}>Выручка</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{master.revenue.toLocaleString()} с.</div>
                </div>
                <div>
                  <div className="text-hint" style={{ fontSize: '12px' }}>Рейтинг</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>⭐ {master.avg_rating.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-hint" style={{ fontSize: '12px' }}>Конверсия</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{master.conversion.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-hint" style={{ fontSize: '12px' }}>Средний чек</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{master.avg_check.toLocaleString()} с.</div>
                </div>
                <div>
                  <div className="text-hint" style={{ fontSize: '12px' }}>Отмены/No-show</div>
                  <div style={{ fontSize: '16px', color: '#ff3b30' }}>
                    {master.cancelled} / {master.no_show}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </>
      )}

      {/* RFM Tab */}
      {tab === 'rfm' && (
        <>
          <Card className="mb-3">
            <h3>RFM Сегментация</h3>
            <div style={{ height: '300px', marginTop: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(rfmGroups).map(([segment, clients]) => ({
                      name: segment,
                      value: clients.length,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.keys(rfmGroups).map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {Object.entries(rfmGroups).map(([segment, clients]) => (
            <Card key={segment} className="mb-2">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>{segment}</h3>
                <span style={{
                  background: 'var(--tg-theme-button-color)',
                  color: 'var(--tg-theme-button-text-color)',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '14px',
                }}>
                  {clients.length} чел.
                </span>
              </div>
              <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '12px' }}>
                {clients.slice(0, 5).map((client) => (
                  <div
                    key={client.chat_id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: '1px solid var(--tg-theme-secondary-bg-color)',
                    }}
                  >
                    <span>{client.name}</span>
                    <span className="text-hint">{client.total_spent.toLocaleString()} с.</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
