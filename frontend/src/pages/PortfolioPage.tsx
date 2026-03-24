import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPortfolio, getMasterPhotos } from '../services/api';
import type { Portfolio, MasterPhoto } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

const CATEGORIES = [
  { id: 'all', name: 'Все работы', icon: '🎨' },
  { id: 'haircut', name: 'Стрижки', icon: '💇' },
  { id: 'manicure', name: 'Маникюр', icon: '💅' },
  { id: 'makeup', name: 'Макияж', icon: '💄' },
  { id: 'massage', name: 'Массаж', icon: '💆' },
  { id: 'coloring', name: 'Окрашивание', icon: '🎨' },
];

export default function PortfolioPage() {
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [masterPhotos, setMasterPhotos] = useState<MasterPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [lightbox, setLightbox] = useState<{ open: boolean; image: Portfolio | null }>({
    open: false,
    image: null,
  });

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const loadData = async () => {
    setLoading(true);
    try {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const [portfolioData, masterPhotosData] = await Promise.all([
        getPortfolio(category, undefined, 100),
        getMasterPhotos(),
      ]);
      setPortfolio(portfolioData);
      setMasterPhotos(masterPhotosData);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const openLightbox = (photo: Portfolio) => {
    setLightbox({ open: true, image: photo });
  };

  const closeLightbox = () => {
    setLightbox({ open: false, image: null });
  };

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
        <h1 style={{ margin: 0 }}>Наши работы</h1>
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto' }}>
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? 'primary' : 'secondary'}
            onClick={() => setSelectedCategory(cat.id)}
            style={{ flex: 'none', whiteSpace: 'nowrap' }}
          >
            {cat.icon} {cat.name}
          </Button>
        ))}
      </div>

      {/* Master Photos */}
      {masterPhotos.length > 0 && (
        <Card className="mb-3">
          <h3>Наши мастера</h3>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', overflowX: 'auto' }}>
            {masterPhotos.map((photo) => (
              <div key={photo.master} style={{ textAlign: 'center' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'var(--tg-theme-secondary-bg-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  margin: '0 auto 4px',
                }}>
                  <span style={{ fontSize: '32px' }}>👤</span>
                </div>
                <div style={{ fontSize: '12px' }}>{photo.master}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : portfolio.length === 0 ? (
        <Card>
          <p className="text-center text-hint">
            В этой категории пока нет работ
          </p>
        </Card>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
        }}>
          {portfolio.map((item) => (
            <div key={item.id}>
              <Card
                onClick={() => openLightbox(item)}
                style={{ cursor: 'pointer', padding: '8px' }}
              >
                <div style={{
                  width: '100%',
                  aspectRatio: '1',
                  background: 'var(--tg-theme-secondary-bg-color)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  <span style={{ fontSize: '48px' }}>📸</span>
                </div>
                {item.description && (
                  <p style={{
                    fontSize: '12px',
                    marginTop: '8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {item.description}
                  </p>
                )}
                <p className="text-hint" style={{
                  fontSize: '11px',
                  marginTop: '4px',
                }}>
                  {item.category} {item.master ? `• ${item.master}` : ''}
                </p>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightbox.open && lightbox.image && (
        <div
          onClick={closeLightbox}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <div style={{
              fontSize: '32px',
              position: 'absolute',
              top: '-40px',
              right: '0',
              cursor: 'pointer',
              color: 'white',
            }}
            onClick={closeLightbox}
            >
              ✕
            </div>
            <div style={{
              background: 'var(--tg-theme-bg-color)',
              borderRadius: '12px',
              padding: '16px',
              maxWidth: '400px',
            }}>
              <div style={{
                width: '100%',
                aspectRatio: '1',
                background: 'var(--tg-theme-secondary-bg-color)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
              }}>
                <span style={{ fontSize: '96px' }}>📸</span>
              </div>
              {lightbox.image.description && (
                <p style={{ margin: '0 0 8px 0' }}>{lightbox.image.description}</p>
              )}
              <p className="text-hint" style={{ fontSize: '12px', margin: 0 }}>
                Категория: {lightbox.image.category}
              </p>
              {lightbox.image.master && (
                <p className="text-hint" style={{ fontSize: '12px', margin: '4px 0 0 0' }}>
                  Мастер: {lightbox.image.master}
                </p>
              )}
              <p className="text-hint" style={{ fontSize: '11px', margin: '8px 0 0 0' }}>
                {lightbox.image.added_at}
              </p>
            </div>
          </div>
        </div>
      )}

      <Card className="mt-3">
        <p className="text-hint text-center">
          📍 г. Бишкек, ул. Ахунбаева, 1
        </p>
        <p className="text-hint text-center">
          📞 +996 707 001112
        </p>
      </Card>
    </div>
  );
}
