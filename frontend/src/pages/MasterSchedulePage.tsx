import { useState, useEffect } from 'react';
import {
  getMasterSchedule,
  createMasterSchedule,
  deleteMasterSchedule,
  getMasterTimeOff,
  createMasterTimeOff,
  deleteMasterTimeOff,
  getMasterAvailability,
} from '../services/api';
import type { MasterSchedule, MasterTimeOff, MasterAvailability } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

const MASTERS = ['Айгуль', 'Диана', 'Айгерим', 'Эльвира', 'Любой мастер'];
const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
];

const TIME_OFF_REASONS = [
  { value: 'vacation', label: '🏖 Отпуск' },
  { value: 'sick', label: '🤒 Больничный' },
  { value: 'personal', label: '📝 Личный' },
  { value: 'holiday', label: '🎉 Праздник' },
];

export default function MasterSchedulePage() {
  const [selectedMaster, setSelectedMaster] = useState(MASTERS[0]);
  const [schedules, setSchedules] = useState<MasterSchedule[]>([]);
  const [timeOffs, setTimeOffs] = useState<MasterTimeOff[]>([]);
  const [availability, setAvailability] = useState<MasterAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'schedule' | 'time-off' | 'calendar'>('schedule');
  
  // Формы
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    day_of_week: 0,
    start_time: '09:00',
    end_time: '20:00',
    is_working: true,
  });

  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [timeOffForm, setTimeOffForm] = useState({
    start_date: '',
    end_date: '',
    reason: 'vacation',
    comment: '',
  });

  useEffect(() => {
    loadData();
  }, [selectedMaster]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [schedulesData, timeOffsData] = await Promise.all([
        getMasterSchedule(selectedMaster),
        getMasterTimeOff(selectedMaster),
      ]);
      setSchedules(schedulesData);
      setTimeOffs(timeOffsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      await createMasterSchedule({
        master: selectedMaster,
        ...scheduleForm,
      });
      await loadData();
      setShowScheduleForm(false);
    } catch (error) {
      alert('Ошибка при сохранении расписания');
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    if (confirm('Удалить расписание?')) {
      try {
        await deleteMasterSchedule(id);
        await loadData();
      } catch (error) {
        alert('Ошибка при удалении');
      }
    }
  };

  const handleCreateTimeOff = async () => {
    if (!timeOffForm.start_date || !timeOffForm.end_date) {
      alert('Выберите даты');
      return;
    }
    try {
      await createMasterTimeOff({
        master: selectedMaster,
        ...timeOffForm,
      });
      await loadData();
      setShowTimeOffForm(false);
    } catch (error) {
      alert('Ошибка при сохранении');
    }
  };

  const handleDeleteTimeOff = async (id: number) => {
    if (confirm('Удалить период отсутствия?')) {
      try {
        await deleteMasterTimeOff(id);
        await loadData();
      } catch (error) {
        alert('Ошибка при удалении');
      }
    }
  };

  const loadAvailability = async () => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);
    
    const startDateStr = today.toLocaleDateString('ru-RU');
    const endDateStr = endDate.toLocaleDateString('ru-RU');
    
    try {
      const data = await getMasterAvailability(selectedMaster, startDateStr, endDateStr);
      setAvailability(data);
    } catch (error) {
      console.error('Failed to load availability:', error);
    }
  };

  useEffect(() => {
    if (tab === 'calendar') {
      loadAvailability();
    }
  }, [tab, selectedMaster]);

  return (
    <div className="page">
      <h1>Расписание мастеров</h1>

      {/* Выбор мастера */}
      <Card className="mb-3">
        <label style={{ display: 'block', marginBottom: '8px' }}>Мастер:</label>
        <select
          className="input"
          value={selectedMaster}
          onChange={(e) => setSelectedMaster(e.target.value)}
        >
          {MASTERS.map((master) => (
            <option key={master} value={master}>{master}</option>
          ))}
        </select>
      </Card>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <Button
          variant={tab === 'schedule' ? 'primary' : 'secondary'}
          onClick={() => setTab('schedule')}
          style={{ flex: 1 }}
        >
          📅 Расписание
        </Button>
        <Button
          variant={tab === 'time-off' ? 'primary' : 'secondary'}
          onClick={() => setTab('time-off')}
          style={{ flex: 1 }}
        >
          🏖 Отсутствия
        </Button>
        <Button
          variant={tab === 'calendar' ? 'primary' : 'secondary'}
          onClick={() => setTab('calendar')}
          style={{ flex: 1 }}
        >
          📊 Календарь
        </Button>
      </div>

      {loading && <div className="loading">Загрузка...</div>}

      {/* Schedule Tab */}
      {tab === 'schedule' && !loading && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Недельное расписание</h3>
            <Button onClick={() => setShowScheduleForm(!showScheduleForm)}>
              {showScheduleForm ? 'Закрыть' : '+ Добавить'}
            </Button>
          </div>

          {showScheduleForm && (
            <Card className="mb-3">
              <h4>Добавить расписание</h4>
              
              <label className="mt-2" style={{ display: 'block', marginBottom: '8px' }}>День недели:</label>
              <select
                className="input"
                value={scheduleForm.day_of_week}
                onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: parseInt(e.target.value) })}
              >
                {DAY_NAMES.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px' }}>Начало:</label>
                  <select
                    className="input"
                    value={scheduleForm.start_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                  >
                    {TIME_SLOTS.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px' }}>Конец:</label>
                  <select
                    className="input"
                    value={scheduleForm.end_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                  >
                    {TIME_SLOTS.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={scheduleForm.is_working}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, is_working: e.target.checked })}
                  />
                  Рабочий день
                </label>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <Button fullWidth onClick={handleCreateSchedule}>Сохранить</Button>
                <Button variant="secondary" fullWidth onClick={() => setShowScheduleForm(false)}>Отмена</Button>
              </div>
            </Card>
          )}

          {schedules.length === 0 ? (
            <Card>
              <p className="text-center text-hint">Расписание не установлено</p>
            </Card>
          ) : (
            schedules.map((schedule) => (
              <Card key={schedule.id} className="mb-2">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4>{DAY_NAMES[schedule.day_of_week]}</h4>
                    <p className="text-hint">
                      {schedule.is_working ? (
                        `${schedule.start_time} - ${schedule.end_time}`
                      ) : (
                        <span style={{ color: '#f44336' }}>Выходной</span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => handleDeleteSchedule(schedule.id)}
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                  >
                    Удалить
                  </Button>
                </div>
              </Card>
            ))
          )}
        </>
      )}

      {/* Time Off Tab */}
      {tab === 'time-off' && !loading && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Периоды отсутствия</h3>
            <Button onClick={() => setShowTimeOffForm(!showTimeOffForm)}>
              {showTimeOffForm ? 'Закрыть' : '+ Добавить'}
            </Button>
          </div>

          {showTimeOffForm && (
            <Card className="mb-3">
              <h4>Добавить отсутствие</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px' }}>Дата начала:</label>
                  <input
                    type="date"
                    className="input"
                    value={timeOffForm.start_date}
                    onChange={(e) => setTimeOffForm({ ...timeOffForm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px' }}>Дата окончания:</label>
                  <input
                    type="date"
                    className="input"
                    value={timeOffForm.end_date}
                    onChange={(e) => setTimeOffForm({ ...timeOffForm, end_date: e.target.value })}
                  />
                </div>
              </div>

              <label className="mt-2" style={{ display: 'block', marginBottom: '8px' }}>Причина:</label>
              <select
                className="input"
                value={timeOffForm.reason}
                onChange={(e) => setTimeOffForm({ ...timeOffForm, reason: e.target.value })}
              >
                {TIME_OFF_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>

              <label className="mt-2" style={{ display: 'block', marginBottom: '8px' }}>Комментарий:</label>
              <textarea
                className="input"
                placeholder="Необязательно"
                value={timeOffForm.comment}
                onChange={(e) => setTimeOffForm({ ...timeOffForm, comment: e.target.value })}
                rows={3}
              />

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <Button fullWidth onClick={handleCreateTimeOff}>Сохранить</Button>
                <Button variant="secondary" fullWidth onClick={() => setShowTimeOffForm(false)}>Отмена</Button>
              </div>
            </Card>
          )}

          {timeOffs.length === 0 ? (
            <Card>
              <p className="text-center text-hint">Периоды отсутствия не указаны</p>
            </Card>
          ) : (
            timeOffs.map((to) => (
              <Card key={to.id} className="mb-2">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4>
                      {TIME_OFF_REASONS.find(r => r.value === to.reason)?.label || to.reason}
                    </h4>
                    <p className="text-hint">
                      {to.start_date} - {to.end_date}
                    </p>
                    {to.comment && <p className="text-hint">{to.comment}</p>}
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => handleDeleteTimeOff(to.id)}
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                  >
                    Удалить
                  </Button>
                </div>
              </Card>
            ))
          )}
        </>
      )}

      {/* Calendar Tab */}
      {tab === 'calendar' && !loading && (
        <Card>
          <h3>Календарь доступности (30 дней)</h3>
          <p className="text-hint" style={{ fontSize: '13px', marginTop: '8px' }}>
            Показывает рабочие и выходные дни мастера
          </p>

          <div style={{ marginTop: '16px' }}>
            {availability.slice(0, 14).map((day) => (
              <div
                key={day.date}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--tg-theme-secondary-bg-color)',
                }}
              >
                <div>
                  <div style={{ fontWeight: '600' }}>{day.date}</div>
                  {day.schedule && day.is_working && (
                    <div className="text-hint" style={{ fontSize: '12px' }}>
                      {day.schedule.start_time} - {day.schedule.end_time}
                    </div>
                  )}
                </div>
                <div style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: day.is_available ? '#4CAF5020' : '#f4433620',
                  color: day.is_available ? '#4CAF50' : '#f44336',
                }}>
                  {day.is_available ? '✓ Рабочий' : '✕ Выходной'}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
