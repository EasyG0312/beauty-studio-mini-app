import { useState, useEffect } from 'react';
import { getReviews, createReview } from '../services/api';
import type { Review } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [bookingId, setBookingId] = useState<number | null>(null);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await getReviews(50);
      setReviews(data);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!bookingId) {
      alert('Выберите запись для отзыва');
      return;
    }

    try {
      await createReview({ booking_id: bookingId, rating, comment });
      alert('Спасибо за ваш отзыв!');
      setShowForm(false);
      setComment('');
      setRating(5);
      loadReviews();
    } catch (error) {
      alert('Ошибка при отправке отзыва');
    }
  };

  const renderStars = (rating: number) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Отзывы</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Закрыть' : 'Оставить отзыв'}
        </Button>
      </div>

      {showForm && (
        <Card className="mt-3">
          <h3>Ваш отзыв</h3>
          
          <input
            type="number"
            className="input mt-2"
            placeholder="ID записи"
            value={bookingId || ''}
            onChange={(e) => setBookingId(parseInt(e.target.value) || null)}
          />

          <div className="mt-3">
            <label>Оценка:</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    opacity: star <= rating ? 1 : 0.3,
                  }}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>

          <textarea
            className="input mt-3"
            placeholder="Ваш комментарий"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />

          <Button fullWidth onClick={handleSubmit} className="mt-3">
            Отправить отзыв
          </Button>
        </Card>
      )}

      {loading ? (
        <div className="loading mt-3">Загрузка...</div>
      ) : reviews.length === 0 ? (
        <Card className="mt-3">
          <p className="text-center text-hint">Пока нет отзывов</p>
        </Card>
      ) : (
        <div className="mt-3">
          {reviews.map((review) => (
            <Card key={review.id} className="mb-2">
              <div style={{ marginBottom: '8px' }}>
                {renderStars(review.rating)}
              </div>
              {review.comment && (
                <p style={{ marginBottom: '8px' }}>{review.comment}</p>
              )}
              <p className="text-hint" style={{ fontSize: '12px' }}>
                {review.created_at}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
