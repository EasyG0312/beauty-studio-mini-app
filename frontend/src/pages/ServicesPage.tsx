import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';

const SERVICES = [
  { name: 'Стрижка', price: 'от 1200 сом', description: 'Стрижка волос любой длины' },
  { name: 'Маникюр', price: 'от 900 сом', description: 'Классический маникюр' },
  { name: 'Массаж лица', price: 'от 1500 сом', description: 'Расслабляющий массаж лица' },
  { name: 'Макияж', price: 'от 1800 сом', description: 'Дневной или вечерний макияж' },
  { name: 'Окрашивание', price: 'от 2500 сом', description: 'Окрашивание волос' },
];

const MASTERS = [
  { name: 'Айгуль', spec: 'Стрижки, окрашивание', rating: 4.9 },
  { name: 'Диана', spec: 'Маникюр, педикюр', rating: 4.8 },
  { name: 'Айгерим', spec: 'Макияж, брови', rating: 4.9 },
  { name: 'Эльвира', spec: 'Массаж лица, уход', rating: 4.7 },
];

export default function ServicesPage() {
  const navigate = useNavigate();
  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ←
        </button>
        <h1 style={{ margin: 0 }}>Услуги и цены</h1>
      </div>

      <Card>
        <h2>Наши услуги</h2>
        <div className="mt-2">
          {SERVICES.map((service) => (
            <div key={service.name} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '12px 0',
              borderBottom: '1px solid var(--tg-theme-secondary-bg-color)'
            }}>
              <div>
                <strong>{service.name}</strong>
                <p className="text-hint" style={{ fontSize: '14px', marginTop: '4px' }}>
                  {service.description}
                </p>
              </div>
              <strong>{service.price}</strong>
            </div>
          ))}
        </div>
      </Card>

      <h2 className="mt-3">Наши мастера</h2>
      <Card>
        <div className="mt-2">
          {MASTERS.map((master) => (
            <div key={master.name} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid var(--tg-theme-secondary-bg-color)'
            }}>
              <div>
                <strong>{master.name}</strong>
                <p className="text-hint" style={{ fontSize: '14px', marginTop: '4px' }}>
                  {master.spec}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '18px' }}>⭐</span>
                <strong>{master.rating}</strong>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-3">
        <h3>Контакты</h3>
        <p className="mt-2">
          <strong>Beauty Studio Bishkek</strong><br />
          📍 г. Бишкек, ул. Ахунбаева, 1<br />
          📞 +996 707 001112<br />
          ⏰ Пн-Сб: 09:00 - 20:00
        </p>
      </Card>
    </div>
  );
}
