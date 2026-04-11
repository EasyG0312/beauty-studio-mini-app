import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { IconChevronLeft, IconCamera, IconX } from '../components/Icons';
import { getMasterPhotos, addMasterPhoto } from '../services/api';

interface MasterPhotoItem {
  id: number;
  master_name: string;
  file_id: string;
  created_at: string;
}

const MASTER_NAMES = ['Айгуль', 'Диана', 'Айгерим', 'Эльвира'];

export default function MasterPhotosPage() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<MasterPhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const data = await getMasterPhotos();
      setPhotos((data as unknown as MasterPhotoItem[]).filter(Boolean));
    } catch (e) {
      console.error('Failed to load master photos:', e);
      setPhotos([]);
    }
  };

  const handleUpload = async () => {
    if (!selectedMaster || !uploadUrl) {
      alert('Выберите мастера и введите URL фото');
      return;
    }
    setLoading(true);
    try {
      await addMasterPhoto(selectedMaster, uploadUrl);
      setUploadUrl('');
      await loadPhotos();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (_id: number) => {
    if (!confirm('Удалить фото?')) return;
    alert('Удаление фото будет доступно в следующей версии');
  };

  const filteredPhotos = selectedMaster
    ? photos.filter((p: any) => p.master_name === selectedMaster)
    : photos;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/manager')}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            display: 'flex',
            color: 'var(--brand-gold)',
          }}
        >
          <IconChevronLeft size={24} />
        </button>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>Фото мастеров</h1>
      </div>

      {/* Upload Form */}
      <Card style={{ padding: 24, borderRadius: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: 16 }}>
          Добавить фото
        </h3>
        <select
          className="input"
          value={selectedMaster}
          onChange={(e) => setSelectedMaster(e.target.value)}
        >
          <option value="">Выберите мастера</option>
          {MASTER_NAMES.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <input
          type="url"
          className="input"
          placeholder="URL фото (или file_id Telegram)"
          value={uploadUrl}
          onChange={(e) => setUploadUrl(e.target.value)}
        />
        <Button
          fullWidth
          onClick={handleUpload}
          disabled={loading || !selectedMaster || !uploadUrl}
          leftIcon={<IconCamera size={18} />}
        >
          {loading ? 'Загрузка...' : 'Загрузить'}
        </Button>
      </Card>

      {/* Filter by Master */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '16px 0', marginBottom: 8 }}>
        <Button
          variant={!selectedMaster ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setSelectedMaster('')}
          style={{ whiteSpace: 'nowrap' }}
        >
          Все
        </Button>
        {MASTER_NAMES.map((name) => (
          <Button
            key={name}
            variant={selectedMaster === name ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedMaster(name)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {name}
          </Button>
        ))}
      </div>

      {/* Photos Grid */}
      {filteredPhotos.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <IconCamera size={48} color="var(--gray-400)" />
          <p className="text-hint" style={{ marginTop: 16 }}>Нет фото</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {filteredPhotos.map((photo: any) => (
            <Card key={photo.id} style={{ padding: 0, overflow: 'hidden', position: 'relative', borderRadius: 16 }}>
              <div style={{
                width: '100%',
                height: 140,
                background: 'var(--gray-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {photo.file_id?.startsWith('http') ? (
                  <img src={photo.file_id} alt={photo.master_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <IconCamera size={32} color="var(--gray-400)" />
                )}
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{photo.master_name}</div>
                  <div className="text-hint" style={{ fontSize: 10 }}>{photo.created_at?.slice(0, 16)}</div>
                </div>
                <button
                  onClick={() => handleDelete(photo.id)}
                  style={{
                    background: 'var(--color-danger-bg)',
                    border: 'none',
                    borderRadius: 8,
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                  }}
                >
                  <IconX size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
