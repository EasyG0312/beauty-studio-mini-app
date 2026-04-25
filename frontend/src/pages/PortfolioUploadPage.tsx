import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../services/haptic';
import Card from '../components/Card';
import Button from '../components/Button';
import { IconChevronLeft, IconUpload, IconX } from '../components/Icons';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const CATEGORIES = [
  { id: 'manicure', name: 'Маникюр', emoji: '💅' },
  { id: 'haircut', name: 'Стрижка', emoji: '💇' },
  { id: 'coloring', name: 'Окрашивание', emoji: '🎨' },
  { id: 'makeup', name: 'Макияж', emoji: '💄' },
  { id: 'massage', name: 'Массаж', emoji: '💆' },
  { id: 'other', name: 'Другое', emoji: '✨' },
];

export default function PortfolioUploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState('manicure');
  const [description, setDescription] = useState('');
  const [master, setMaster] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение');
      return;
    }

    // Проверка размера (макс 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Файл слишком большой (макс 10MB)');
      return;
    }

    setSelectedFile(file);
    setError('');

    // Создаём превью
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    haptic.impact();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Выберите фото');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('master', master);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/portfolio`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      });

      if (response.ok) {
        haptic.notification('success');
        setUploaded(true);
      } else {
        const data = await response.json();
        setError(data.detail || 'Ошибка при загрузке');
      }
    } catch (err) {
      setError('Сетевая ошибка. Попробуйте позже.');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreview(null);
    setDescription('');
    setUploaded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (uploaded) {
    return (
      <div className="page">
        <div className="page-header" style={{ marginBottom: 16 }}>
          <button 
            onClick={() => navigate('/portfolio')} 
            style={{ background: 'none', border: 'none', padding: 8, marginLeft: -8, cursor: 'pointer' }}
          >
            <IconChevronLeft size={24} />
          </button>
        </div>

        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', marginBottom: 12 }}>
            Фото загружено!
          </h2>
          <p style={{ color: 'var(--tg-theme-hint-color)', marginBottom: 24 }}>
            Работа появится в портфолио после проверки
          </p>
          <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
            <Button onClick={resetForm} variant="primary">
              Загрузить ещё
            </Button>
            <Button onClick={() => navigate('/portfolio')} variant="ghost">
              К портфолио
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <button 
          onClick={() => navigate('/portfolio')} 
          style={{ background: 'none', border: 'none', padding: 8, marginLeft: -8, cursor: 'pointer' }}
        >
          <IconChevronLeft size={24} />
        </button>
        <h1 className="page-title" style={{ fontFamily: 'var(--font-serif)', margin: 0, flex: 1 }}>
          Добавить работу
        </h1>
      </div>

      {/* Upload Area */}
      <Card 
        elevated 
        style={{ 
          marginBottom: 16, 
          padding: preview ? 16 : 40,
          textAlign: 'center',
          border: preview ? 'none' : '2px dashed var(--tg-theme-hint-color)',
          background: preview ? 'var(--tg-theme-bg-color)' : 'var(--tg-theme-secondary-bg-color)',
          cursor: preview ? 'default' : 'pointer'
        }}
        onClick={() => !preview && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {preview ? (
          <div style={{ position: 'relative' }}>
            <img 
              src={preview} 
              alt="Preview" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: 300, 
                borderRadius: 12,
                objectFit: 'cover'
              }} 
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
                setPreview(null);
              }}
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#f44336',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <IconX size={16} />
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Нажмите чтобы выбрать фото
            </div>
            <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
              или перетащите сюда
            </div>
            <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginTop: 8 }}>
              JPG, PNG до 10MB
            </div>
          </>
        )}
      </Card>

      {/* Category */}
      <Card style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
          Категория
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                border: 'none',
                background: category === cat.id ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
                color: category === cat.id ? '#fff' : 'var(--tg-theme-text-color)',
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>{cat.emoji}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </Card>

      {/* Master */}
      <Card style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
          Мастер
        </label>
        <input
          type="text"
          className="input"
          value={master}
          onChange={(e) => setMaster(e.target.value)}
          placeholder="Имя мастера"
          style={{ width: '100%' }}
        />
      </Card>

      {/* Description */}
      <Card style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
          Описание (необязательно)
        </label>
        <textarea
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Опишите работу, использованные материалы..."
          style={{ width: '100%', minHeight: 80 }}
        />
      </Card>

      {/* Error */}
      {error && (
        <div style={{ 
          background: '#ffebee', 
          color: '#f44336', 
          padding: 12, 
          borderRadius: 10,
          marginBottom: 16,
          fontSize: 14
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Upload Button */}
      <Button 
        onClick={handleUpload} 
        fullWidth 
        disabled={!selectedFile || uploading}
        size="lg"
      >
        {uploading ? (
          'Загрузка...'
        ) : (
          <>
            <IconUpload size={18} />
            Опубликовать работу
          </>
        )}
      </Button>
    </div>
  );
}
