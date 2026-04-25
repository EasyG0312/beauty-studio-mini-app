import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { haptic } from '../services/haptic';
import Card from '../components/Card';
import Button from '../components/Button';
import { IconChevronLeft, IconSend } from '../components/Icons';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function CreateReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking');
  
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Пожалуйста, выберите оценку');
      return;
    }
    
    if (!bookingId) {
      setError('Ошибка: не указан ID записи');
      return;
    }

    setLoading(true);
    setError('');
    haptic.notification('success');

    try {
      const response = await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: parseInt(bookingId),
          rating: rating,
          comment: comment.trim()
        })
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const data = await response.json();
        setError(data.detail || 'Ошибка при отправке отзыва');
      }
    } catch (err) {
      setError('Сетевая ошибка. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (count: number, interactive: boolean = false) => {
    return (
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            style={{
              background: 'none',
              border: 'none',
              cursor: interactive ? 'pointer' : 'default',
              fontSize: interactive ? 40 : 32,
              transition: 'transform 0.2s',
              transform: interactive && hoverRating >= star ? 'scale(1.2)' : 'scale(1)',
              color: star <= (interactive ? (hoverRating || rating) : count) ? '#FFD700' : '#ddd',
              padding: 0
            }}
            disabled={!interactive}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  if (submitted) {
    return (
      <div className="page">
        <div className="page-header" style={{ marginBottom: 16 }}>
          <button 
            onClick={() => navigate('/my-bookings')} 
            style={{ background: 'none', border: 'none', padding: 8, marginLeft: -8, cursor: 'pointer' }}
          >
            <IconChevronLeft size={24} />
          </button>
        </div>

        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⭐</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', marginBottom: 12 }}>
            Спасибо за отзыв!
          </h2>
          <p style={{ color: 'var(--tg-theme-hint-color)', marginBottom: 24 }}>
            Ваша оценка помогает нам становиться лучше
          </p>
          <Button onClick={() => navigate('/my-bookings')} fullWidth>
            К моим записям
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ background: 'none', border: 'none', padding: 8, marginLeft: -8, cursor: 'pointer' }}
        >
          <IconChevronLeft size={24} />
        </button>
        <h1 className="page-title" style={{ fontFamily: 'var(--font-serif)', margin: 0, flex: 1 }}>
          Оставить отзыв
        </h1>
      </div>

      {/* Rating Section */}
      <Card elevated style={{ marginBottom: 16, textAlign: 'center', padding: 24 }}>
        <h3 style={{ margin: '0 0 20px', fontFamily: 'var(--font-serif)' }}>
          Как прошёл визит?
        </h3>
        {renderStars(rating, true)}
        <p style={{ 
          marginTop: 16, 
          color: 'var(--tg-theme-hint-color)',
          fontSize: 14,
          minHeight: 20
        }}>
          {rating === 1 && 'Очень плохо 😞'}
          {rating === 2 && 'Плохо 😕'}
          {rating === 3 && 'Нормально 😐'}
          {rating === 4 && 'Хорошо 🙂'}
          {rating === 5 && 'Отлично! 😍'}
        </p>
      </Card>

      {/* Comment Section */}
      <Card style={{ marginBottom: 16 }}>
        <label style={{ 
          display: 'block', 
          fontSize: 14, 
          fontWeight: 500, 
          marginBottom: 8 
        }}>
          Комментарий (необязательно)
        </label>
        <textarea
          className="input"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Расскажите подробнее о вашем визите..."
          style={{ 
            width: '100%', 
            minHeight: 120,
            resize: 'vertical'
          }}
        />
        <div style={{ 
          textAlign: 'right', 
          fontSize: 12, 
          color: 'var(--tg-theme-hint-color)',
          marginTop: 4
        }}>
          {comment.length}/500
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div style={{ 
          background: '#ffebee', 
          color: '#f44336', 
          padding: 12, 
          borderRadius: 10,
          marginBottom: 16,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span>⚠️</span>
          {error}
        </div>
      )}

      {/* Submit Button */}
      <Button 
        onClick={handleSubmit} 
        fullWidth 
        disabled={rating === 0 || loading}
        size="lg"
      >
        {loading ? (
          'Отправка...'
        ) : (
          <>
            <IconSend size={18} />
            Отправить отзыв
          </>
        )}
      </Button>

      <p style={{ 
        textAlign: 'center', 
        fontSize: 12, 
        color: 'var(--tg-theme-hint-color)',
        marginTop: 16
      }}>
        Отзыв будет опубликован после проверки администратором
      </p>
    </div>
  );
}
