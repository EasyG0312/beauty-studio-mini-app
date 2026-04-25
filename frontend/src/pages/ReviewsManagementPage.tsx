import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../services/haptic';
import Card from '../components/Card';
import Button from '../components/Button';
import { 
  IconChevronLeft, IconX, IconEdit,
  IconTrash, IconSend, IconEye, IconEyeOff
} from '../components/Icons';

interface Review {
  id: number;
  booking_id: number;
  rating: number;
  comment: string;
  created_at: string;
  client_name: string;
  service: string;
  master: string;
  admin_reply: string;
  replied_at: string | null;
  is_visible: boolean;
  is_deleted: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ReviewsManagementPage() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative' | 'unanswered' | 'hidden'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    average: 0,
    fiveStars: 0,
    oneStars: 0,
    unanswered: 0
  });

  const fetchReviews = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/reviews?limit=100&include_hidden=true`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Review[]) => {
    const total = data.length;
    const average = total > 0 ? data.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    const fiveStars = data.filter(r => r.rating === 5).length;
    const oneStars = data.filter(r => r.rating === 1).length;
    const unanswered = data.filter(r => !r.admin_reply && r.rating <= 3).length;
    
    setStats({ total, average: Math.round(average * 10) / 10, fiveStars, oneStars, unanswered });
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const filteredReviews = reviews.filter(review => {
    switch (filter) {
      case 'positive': return review.rating >= 4;
      case 'negative': return review.rating <= 2;
      case 'unanswered': return !review.admin_reply && review.rating <= 3;
      case 'hidden': return !review.is_visible;
      default: return true;
    }
  });

  const handleReply = async () => {
    if (!selectedReview || !replyText.trim()) return;
    
    haptic.notification('success');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/reviews/${selectedReview.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ admin_reply: replyText })
      });
      
      if (response.ok) {
        await fetchReviews();
        setShowReplyModal(false);
        setReplyText('');
        setSelectedReview(null);
      }
    } catch (error) {
      console.error('Error replying to review:', error);
    }
  };

  const handleToggleVisibility = async (review: Review) => {
    haptic.impact();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/reviews/${review.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_visible: !review.is_visible })
      });
      
      if (response.ok) {
        await fetchReviews();
      }
    } catch (error) {
      console.error('Error toggling review visibility:', error);
    }
  };

  const handleDelete = async (review: Review) => {
    if (!confirm('Удалить этот отзыв?')) return;
    
    haptic.notification('success');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/reviews/${review.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        await fetchReviews();
      }
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  const openReplyModal = (review: Review) => {
    setSelectedReview(review);
    setReplyText(review.admin_reply || '');
    setShowReplyModal(true);
  };

  const renderStars = (rating: number, size: number = 16) => {
    return (
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} style={{ color: star <= rating ? '#FFD700' : '#ddd', fontSize: size }}>
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'none', border: 'none', padding: 8, marginLeft: -8, cursor: 'pointer' }}
        >
          <IconChevronLeft size={24} />
        </button>
        <h1 className="page-title" style={{ fontFamily: 'var(--font-serif)', margin: 0, flex: 1 }}>
          Отзывы клиентов
        </h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        <Card elevated style={{ background: '#4CAF50', color: '#fff', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.average}</div>
          <div style={{ fontSize: 11 }}>Средний балл</div>
        </Card>
        <Card elevated style={{ background: '#2196F3', color: '#fff', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.total}</div>
          <div style={{ fontSize: 11 }}>Всего отзывов</div>
        </Card>
        <Card elevated style={{ background: '#9C27B0', color: '#fff', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.fiveStars}</div>
          <div style={{ fontSize: 11 }}>⭐⭐⭐⭐⭐</div>
        </Card>
        <Card elevated style={{ background: stats.unanswered > 0 ? '#f44336' : '#607D8B', color: '#fff', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.unanswered}</div>
          <div style={{ fontSize: 11 }}>Без ответа</div>
        </Card>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { id: 'all', label: 'Все', color: '#607D8B' },
          { id: 'positive', label: 'Хорошие', color: '#4CAF50' },
          { id: 'negative', label: 'Плохие', color: '#f44336' },
          { id: 'unanswered', label: 'Без ответа', color: '#FF9800' },
          { id: 'hidden', label: 'Скрытые', color: '#9E9E9E' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: 'none',
              background: filter === f.id ? f.color : 'var(--tg-theme-secondary-bg-color)',
              color: filter === f.id ? '#fff' : 'var(--tg-theme-text-color)',
              fontSize: 13,
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredReviews.map(review => (
          <Card key={review.id} style={{ opacity: review.is_visible ? 1 : 0.6 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              {/* Rating badge */}
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: review.rating >= 4 ? '#4CAF50' : review.rating === 3 ? '#FF9800' : '#f44336',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 18,
                flexShrink: 0
              }}>
                {review.rating}
              </div>
              
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 2 }}>
                      {review.client_name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>
                      {review.service} • {review.master}
                    </div>
                    {renderStars(review.rating, 14)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', textAlign: 'right' }}>
                    {review.created_at}
                  </div>
                </div>

                {/* Comment */}
                {review.comment && (
                  <div style={{ marginTop: 10, padding: 10, background: 'var(--tg-theme-secondary-bg-color)', borderRadius: 8 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>{review.comment}</div>
                  </div>
                )}

                {/* Admin Reply */}
                {review.admin_reply && (
                  <div style={{ marginTop: 10, padding: 10, background: '#e3f2fd', borderRadius: 8, borderLeft: '3px solid #2196F3' }}>
                    <div style={{ fontSize: 12, color: '#2196F3', fontWeight: 600, marginBottom: 4 }}>
                      Ответ администрации {review.replied_at && `• ${review.replied_at}`}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>{review.admin_reply}</div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => openReplyModal(review)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: review.admin_reply ? '#e3f2fd' : '#fff3e0',
                      color: review.admin_reply ? '#2196F3' : '#FF9800',
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <IconEdit size={14} />
                    {review.admin_reply ? 'Изменить ответ' : 'Ответить'}
                  </button>
                  
                  <button
                    onClick={() => handleToggleVisibility(review)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: review.is_visible ? '#e8f5e9' : '#f5f5f5',
                      color: review.is_visible ? '#4CAF50' : '#9E9E9E',
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {review.is_visible ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                    {review.is_visible ? 'Виден' : 'Скрыт'}
                  </button>
                  
                  <button
                    onClick={() => handleDelete(review)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#ffebee',
                      color: '#f44336',
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <IconTrash size={14} />
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredReviews.length === 0 && !loading && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
          <div style={{ fontSize: 16, color: 'var(--tg-theme-hint-color)' }}>
            Отзывы не найдены
          </div>
        </Card>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedReview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <Card style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>
                {selectedReview.admin_reply ? 'Изменить ответ' : 'Ответить на отзыв'}
              </h3>
              <button onClick={() => setShowReplyModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <IconX size={24} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginBottom: 8 }}>
                Отзыв от {selectedReview.client_name}:
              </div>
              <div style={{ padding: 12, background: 'var(--tg-theme-secondary-bg-color)', borderRadius: 8, fontSize: 14 }}>
                {selectedReview.comment || '(без текста)'}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Ваш ответ:</label>
              <textarea
                className="input"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Введите ответ на отзыв..."
                style={{ width: '100%', minHeight: 100 }}
                autoFocus
              />
            </div>

            <Button onClick={handleReply} fullWidth disabled={!replyText.trim()}>
              <IconSend size={18} />
              {selectedReview.admin_reply ? 'Сохранить изменения' : 'Отправить ответ'}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
