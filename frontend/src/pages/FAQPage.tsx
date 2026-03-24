import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import { FAQ_ITEMS } from '../types';

export default function FAQPage() {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqEntries = Object.entries(FAQ_ITEMS);

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
        <h1 style={{ margin: 0 }}>Частые вопросы</h1>
      </div>

      {faqEntries.map(([question, answer], index) => (
        <Card
          key={question}
          className="mb-2"
          onClick={() => setOpenIndex(openIndex === index ? null : index)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>{question}</h3>
            <span style={{
              fontSize: '20px',
              transform: openIndex === index ? 'rotate(45deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}>
              {openIndex === index ? '✕' : '+'}
            </span>
          </div>

          {openIndex === index && (
            <p className="text-hint" style={{ marginTop: '12px' }}>
              {answer}
            </p>
          )}
        </Card>
      ))}

      <Card className="mt-3">
        <h3>Остались вопросы?</h3>
        <p className="text-hint">
          Свяжитесь с нами любым удобным способом:
        </p>
        <p style={{ marginTop: '8px' }}>
          📞 <a href="tel:+996707001112" style={{ color: 'var(--tg-theme-link-color)' }}>+996 707 001112</a>
        </p>
        <p className="text-hint">
          🕒 Пн-Сб: 09:00 - 20:00
        </p>
      </Card>
    </div>
  );
}
