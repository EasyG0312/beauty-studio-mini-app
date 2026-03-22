import { useState, useEffect } from 'react';
import {
  getAnalyticsSummary,
  getMasterKPI,
  getRFMSegments,
  getRevenueForecast,
} from '../services/api';
import type { AnalyticsSummary, MasterKPI, ClientRFM, RevenueForecast } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

export default function OwnerAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [kpi, setKpi] = useState<MasterKPI[]>([]);
  const [rfm, setRfm] = useState<ClientRFM[]>([]);
  const [forecast7, setForecast7] = useState<RevenueForecast | null>(null);
  const [forecast30, setForecast30] = useState<RevenueForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'kpi' | 'rfm'>('overview');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        analyticsData,
        kpiData,
        rfmData,
        forecast7Data,
        forecast30Data,
      ] = await Promise.all([
        getAnalyticsSummary(),
        getMasterKPI(),
        getRFMSegments(),
        getRevenueForecast(7),
        getRevenueForecast(30),
      ]);

      setAnalytics(analyticsData);
      setKpi(kpiData);
      setRfm(rfmData);
      setForecast7(forecast7Data);
      setForecast30(forecast30Data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Загрузка аналитики...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="page">
        <Card>
          <p>Ошибка загрузки аналитики</p>
        </Card>
      </div>
    );
  }

  // Группировка RFM по сегментам
  const rfmGroups = rfm.reduce((acc, client) => {
    const segment = client.rfm_segment;
    if (!acc[segment]) acc[segment] = [];
    acc[segment].push(client);
    return acc;
  }, {} as Record<string, ClientRFM[]>);

  return (
    <div className="page">
      <h1>Аналитика владельца</h1>

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
          variant={tab === 'kpi' ? 'primary' : 'secondary'}
          onClick={() => setTab('kpi')}
          style={{ flex: 'none' }}
        >
          KPI Мастеров
        </Button>
        <Button
          variant={tab === 'rfm' ? 'primary' : 'secondary'}
          onClick={() => setTab('rfm')}
          style={{ flex: 'none' }}
        >
          RFM Сегменты
        </Button>
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <>
          {/* Revenue */}
          <Card>
            <h2>💰 Выручка</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '16px' }}>
              <div>
                <div className="text-hint">За 7 дней</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {analytics.revenue_7d.toLocaleString()} сом
                </div>
                {forecast7 && (
                  <div className="text-hint" style={{ fontSize: '12px', marginTop: '4px' }}>
                    Прогноз: {forecast7.forecast.toLocaleString()} сом
                  </div>
                )}
              </div>
              <div>
                <div className="text-hint">За 30 дней</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {analytics.revenue_30d.toLocaleString()} сом
                </div>
                {forecast30 && (
                  <div className="text-hint" style={{ fontSize: '12px', marginTop: '4px' }}>
                    Прогноз: {forecast30.forecast.toLocaleString()} сом
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Clients */}
          <Card className="mt-3">
            <h2>👥 Клиенты</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '16px' }}>
              <div>
                <div className="text-hint">Всего</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{analytics.total_clients}</div>
              </div>
              <div>
                <div className="text-hint">Постоянных</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{analytics.loyal_clients}</div>
              </div>
            </div>
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--tg-theme-secondary-bg-color)', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}><strong>Лояльность:</strong> {((analytics.loyal_clients / analytics.total_clients) * 100 || 0).toFixed(1)}%</div>
            </div>
          </Card>

          {/* Bookings */}
          <Card className="mt-3">
            <h2>📅 Записи</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
              <div>
                <div className="text-hint">Подтверждено</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--tg-theme-button-color)' }}>
                  {analytics.confirmed}
                </div>
              </div>
              <div>
                <div className="text-hint">Отменено</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff3b30' }}>
                  {analytics.cancelled}
                </div>
              </div>
              <div>
                <div className="text-hint">Не явились</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#9e9e9e' }}>
                  {analytics.no_show}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--tg-theme-secondary-bg-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>Конверсия:</span>
                <strong>
                  {((analytics.confirmed / (analytics.confirmed + analytics.cancelled + analytics.no_show)) * 100 || 0).toFixed(1)}%
                </strong>
              </div>
            </div>
          </Card>

          {/* Rating */}
          <Card className="mt-3">
            <h2>⭐ Рейтинг</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
              <div style={{ fontSize: '48px' }}>⭐</div>
              <div>
                <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
                  {analytics.avg_rating.toFixed(1)}
                </div>
                <div className="text-hint">Средняя оценка</div>
              </div>
            </div>
          </Card>

          {/* Quick stats */}
          <Card className="mt-3">
            <h2>📊 Статистика</h2>
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-theme-secondary-bg-color)' }}>
                <span>Сегодня записей</span>
                <strong>{analytics.today_bookings}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tg-theme-secondary-bg-color)' }}>
                <span>За неделю</span>
                <strong>{analytics.week_bookings}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span>Всего записей</span>
                <strong>{analytics.total_bookings}</strong>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* KPI Tab */}
      {tab === 'kpi' && (
        <>
          <h2>KPI Мастеров</h2>
          {kpi.length === 0 ? (
            <Card>
              <p className="text-center text-hint">Нет данных</p>
            </Card>
          ) : (
            kpi.map((master) => (
              <Card key={master.master} className="mb-2">
                <h3>{master.master}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '12px' }}>
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
            ))
          )}
        </>
      )}

      {/* RFM Tab */}
      {tab === 'rfm' && (
        <>
          <h2>RFM Сегментация клиентов</h2>
          <Card className="mb-2">
            <p className="text-hint" style={{ fontSize: '13px' }}>
              RFM-анализ сегментирует клиентов по давности визита (Recency), частоте (Frequency) и сумме потраченных средств (Monetary).
            </p>
          </Card>

          {Object.entries(rfmGroups).map(([segment, clients]) => (
            <Card key={segment} className="mb-2">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
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

              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {clients.slice(0, 10).map((client) => (
                  <div
                    key={client.chat_id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--tg-theme-secondary-bg-color)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600' }}>{client.name}</div>
                      <div className="text-hint" style={{ fontSize: '12px' }}>
                        Визитов: {client.visit_count} | Послед: {client.last_visit}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '600' }}>{client.total_spent.toLocaleString()} с.</div>
                      <div className="text-hint" style={{ fontSize: '12px' }}>RFM: {client.rfm_score}</div>
                    </div>
                  </div>
                ))}
                {clients.length > 10 && (
                  <p className="text-hint" style={{ textAlign: 'center', marginTop: '8px' }}>
                    + ещё {clients.length - 10} клиентов
                  </p>
                )}
              </div>
            </Card>
          ))}

          {/* RFM Legend */}
          <Card className="mt-3">
            <h4>Расшифровка сегментов:</h4>
            <ul style={{ fontSize: '13px', lineHeight: '1.6', margin: '8px 0 0 16px' }}>
              <li><strong>Champions</strong> — лучшие клиенты, регулярно посещают и много тратят</li>
              <li><strong>Loyal Customers</strong> — лояльные клиенты с хорошим уровнем трат</li>
              <li><strong>Potential Loyalists</strong> — потенциально лояльные, можно увеличить вовлечённость</li>
              <li><strong>At Risk</strong> — клиенты в зоне риска, нужны меры по удержанию</li>
              <li><strong>Lost</strong> — потерянные клиенты, давно не посещали</li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
