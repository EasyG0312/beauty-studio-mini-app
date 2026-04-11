import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { IconScissors, IconNailPolish, IconMakeup, IconMassage, IconColorPalette, IconPhone, IconMapPin, IconClock, IconChevronLeft } from '../components/Icons';

const SERVICES = [
  { name: 'Стрижка', price: 'от 1200 сом', description: 'Стрижка волос любой длины', icon: IconScissors },
  { name: 'Маникюр', price: 'от 900 сом', description: 'Классический маникюр', icon: IconNailPolish },
  { name: 'Массаж лица', price: 'от 1500 сом', description: 'Расслабляющий массаж лица', icon: IconMassage },
  { name: 'Макияж', price: 'от 1800 сом', description: 'Дневной или вечерний макияж', icon: IconMakeup },
  { name: 'Окрашивание', price: 'от 2500 сом', description: 'Окрашивание волос', icon: IconColorPalette },
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-gold)',
          }}
        >
          <IconChevronLeft size={24} />
        </button>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>Услуги и цены</h1>
      </div>

      {/* Services */}
      <Card>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--font-size-xl)', marginBottom: 20 }}>
          Наши услуги
        </h2>
        <div>
          {SERVICES.map((service) => (
            <div key={service.name} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 0',
              borderBottom: '1px solid var(--gray-100)',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/booking')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'var(--brand-gold-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-gold)',
                  flexShrink: 0,
                }}>
                  <service.icon size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: 15 }}>{service.name}</strong>
                  <p className="text-hint" style={{ fontSize: 12, marginTop: 3 }}>
                    {service.description}
                  </p>
                </div>
              </div>
              <strong style={{ color: 'var(--brand-gold)', fontSize: 14, whiteSpace: 'nowrap' }}>
                {service.price}
              </strong>
            </div>
          ))}
        </div>
      </Card>

      {/* Masters */}
      <h2 className="mt-4" style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--font-size-xl)', marginBottom: 16 }}>
        Наши мастера
      </h2>
      <Card>
        <div>
          {MASTERS.map((master) => (
            <div key={master.name} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 0',
              borderBottom: '1px solid var(--gray-100)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--brand-gold-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 16,
                  flexShrink: 0,
                }}>
                  {master.name[0]}
                </div>
                <div>
                  <strong style={{ fontSize: 15 }}>{master.name}</strong>
                  <p className="text-hint" style={{ fontSize: 12, marginTop: 3 }}>
                    {master.spec}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--brand-gold)', fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{master.rating}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Contacts */}
      <Card className="mt-4">
        <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: 16 }}>Контакты</h3>
        <div>
          <p style={{ margin: '10px 0', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            <IconMapPin size={18} color="var(--brand-gold)" />
            г. Бишкек, ул. Ахунбаева, 1
          </p>
          <p style={{ margin: '10px 0', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            <IconPhone size={18} color="var(--brand-gold)" />
            <a href="tel:+996707001112" style={{ color: 'var(--brand-gold)' }}>+996 707 001112</a>
          </p>
          <p style={{ margin: '10px 0', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            <IconClock size={18} color="var(--brand-gold)" />
            Пн-Сб: 09:00 — 20:00
          </p>
        </div>
        <Button
          className="mt-4"
          variant="primary"
          fullWidth
          onClick={() => navigate('/booking')}
        >
          Записаться
        </Button>
      </Card>
    </div>
  );
}
