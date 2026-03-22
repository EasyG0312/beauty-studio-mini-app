import axios from 'axios';
import type {
  Booking, SlotAvailability, AnalyticsSummary, BookingCreate,
  Review, Waitlist, Blacklist, Portfolio, ChatMessage,
  MasterKPI, ClientRFM, RevenueForecast, Client, LoyaltyStatus,
  MasterPhoto, AnalyticsDashboard, FunnelStats, HourlyHeatmap, ComparisonStats,
  MasterSchedule, MasterTimeOff, MasterAvailability,
  PromoCode, PromoCodeValidationResult
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен авторизации к запросам
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authTelegram = async (authData: {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  hash: string;
  auth_date: number;
}) => {
  const response = await api.post('/auth/telegram', authData);
  return response.data;
};

// Bookings
export const getBookings = async (params?: {
  status_filter?: string;
  date?: string;
  chat_id?: number;
}) => {
  const response = await api.get<Booking[]>('/bookings', { params });
  return response.data;
};

export const getBooking = async (id: number) => {
  const response = await api.get<Booking>(`/bookings/${id}`);
  return response.data;
};

export const createBooking = async (booking: BookingCreate) => {
  const response = await api.post<Booking>('/bookings', booking);
  return response.data;
};

export const updateBooking = async (id: number, data: Partial<Booking>) => {
  const response = await api.put<Booking>(`/bookings/${id}`, data);
  return response.data;
};

export const deleteBooking = async (id: number) => {
  await api.delete(`/bookings/${id}`);
};

// Slots
export const getAvailableSlots = async (date: string, master: string = 'all') => {
  const response = await api.get<SlotAvailability>(`/slots/${date}`, {
    params: { master },
  });
  return response.data;
};

// Analytics
export const getAnalyticsSummary = async () => {
  const response = await api.get<AnalyticsSummary>('/analytics/summary');
  return response.data;
};

export const getMasterKPI = async () => {
  const response = await api.get<MasterKPI[]>('/analytics/kpi');
  return response.data;
};

export const getRFMSegments = async () => {
  const response = await api.get<ClientRFM[]>('/analytics/rfm');
  return response.data;
};

export const getRevenueForecast = async (days: number = 7) => {
  const response = await api.get<RevenueForecast>('/analytics/forecast', {
    params: { days },
  });
  return response.data;
};

// Advanced Analytics
export const getAnalyticsDashboard = async (days: number = 30) => {
  const response = await api.get<AnalyticsDashboard>('/analytics/dashboard', {
    params: { days },
  });
  return response.data;
};

export const getFunnelStats = async (days: number = 30) => {
  const response = await api.get<FunnelStats>('/analytics/funnel', {
    params: { days },
  });
  return response.data;
};

export const getHeatmapData = async (days: number = 30) => {
  const response = await api.get<HourlyHeatmap[]>('/analytics/heatmap', {
    params: { days },
  });
  return response.data;
};

export const getComparisonStats = async (days: number = 30) => {
  const response = await api.get<ComparisonStats>('/analytics/comparison', {
    params: { days },
  });
  return response.data;
};

export const exportAnalyticsCSV = async (days: number = 30) => {
  const response = await api.get('/analytics/export/csv', {
    params: { days },
    responseType: 'blob',
  });
  return response.data;
};

// Master Schedule
export const getMasterSchedule = async (master?: string) => {
  const response = await api.get<MasterSchedule[]>('/masters/schedule', {
    params: { master },
  });
  return response.data;
};

export const createMasterSchedule = async (schedule: {
  master: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
}) => {
  const response = await api.post<MasterSchedule>('/masters/schedule', schedule);
  return response.data;
};

export const updateMasterSchedule = async (id: number, data: {
  start_time?: string;
  end_time?: string;
  is_working?: boolean;
  is_active?: boolean;
}) => {
  const response = await api.put<MasterSchedule>(`/masters/schedule/${id}`, data);
  return response.data;
};

export const deleteMasterSchedule = async (id: number) => {
  await api.delete(`/masters/schedule/${id}`);
};

// Master Time Off
export const getMasterTimeOff = async (master?: string, startDate?: string, endDate?: string) => {
  const response = await api.get<MasterTimeOff[]>('/masters/time-off', {
    params: { master, start_date: startDate, end_date: endDate },
  });
  return response.data;
};

export const createMasterTimeOff = async (timeOff: {
  master: string;
  start_date: string;
  end_date: string;
  reason: string;
  comment: string;
}) => {
  const response = await api.post<MasterTimeOff>('/masters/time-off', timeOff);
  return response.data;
};

export const updateMasterTimeOff = async (id: number, data: {
  start_date?: string;
  end_date?: string;
  reason?: string;
  comment?: string;
  is_active?: boolean;
}) => {
  const response = await api.put<MasterTimeOff>(`/masters/time-off/${id}`, data);
  return response.data;
};

export const deleteMasterTimeOff = async (id: number) => {
  await api.delete(`/masters/time-off/${id}`);
};

// Master Availability
export const getMasterAvailability = async (master: string, startDate: string, endDate: string) => {
  const response = await api.get<MasterAvailability[]>(`/masters/${master}/availability`, {
    params: { start_date: startDate, end_date: endDate },
  });
  return response.data;
};

// Promo Codes
export const getPromocodes = async (activeOnly: boolean = true) => {
  const response = await api.get<PromoCode[]>('/promocodes', {
    params: { active_only: activeOnly },
  });
  return response.data;
};

export const createPromocode = async (data: {
  code: string;
  discount_percent: number;
  discount_amount: number;
  min_booking_amount: number;
  valid_from: string;
  valid_until: string;
  usage_limit: number;
}) => {
  const response = await api.post<PromoCode>('/promocodes', data);
  return response.data;
};

export const validatePromocode = async (code: string, bookingId: number) => {
  const response = await api.post<PromoCodeValidationResult>('/promocodes/validate', {
    code,
    booking_id: bookingId,
  });
  return response.data;
};

export const updatePromocode = async (id: number, data: Partial<PromoCode>) => {
  const response = await api.put<PromoCode>(`/promocodes/${id}`, data);
  return response.data;
};

export const deletePromocode = async (id: number) => {
  await api.delete(`/promocodes/${id}`);
};

export const usePromocode = async (id: number) => {
  const response = await api.post(`/promocodes/${id}/use`);
  return response.data;
};

// Reviews
export const getReviews = async (limit: number = 20, ratingFilter?: number) => {
  const response = await api.get<Review[]>('/reviews', {
    params: { limit, rating_filter: ratingFilter },
  });
  return response.data;
};

export const createReview = async (review: { booking_id: number; rating: number; comment?: string }) => {
  const response = await api.post<Review>('/reviews', review);
  return response.data;
};

// Waitlist
export const getWaitlist = async (date?: string, master?: string) => {
  const response = await api.get<Waitlist[]>('/waitlist', { params: { date, master } });
  return response.data;
};

export const addToWaitlist = async (waitlist: Omit<Waitlist, 'id' | 'created_at'>) => {
  const response = await api.post<Waitlist>('/waitlist', waitlist);
  return response.data;
};

export const removeFromWaitlist = async (id: number) => {
  await api.delete(`/waitlist/${id}`);
};

// Blacklist
export const getBlacklist = async () => {
  const response = await api.get<Blacklist[]>('/blacklist');
  return response.data;
};

export const addToBlacklist = async (blacklist: Omit<Blacklist, 'added_at' | 'added_by'>) => {
  const response = await api.post<Blacklist>('/blacklist', blacklist);
  return response.data;
};

export const removeFromBlacklist = async (chatId: number) => {
  await api.delete(`/blacklist/${chatId}`);
};

// Portfolio
export const getPortfolio = async (category?: string, master?: string, limit: number = 50) => {
  const response = await api.get<Portfolio[]>('/portfolio', {
    params: { category, master, limit },
  });
  return response.data;
};

export const getPortfolioByService = async (service: string) => {
  const response = await api.get<Portfolio[]>(`/portfolio/by-service/${service}`);
  return response.data;
};

export const addToPortfolio = async (data: {
  file_id: string;
  category: string;
  description?: string;
  master?: string;
}) => {
  const response = await api.post<Portfolio>('/portfolio', data);
  return response.data;
};

export const updatePortfolio = async (id: number, data: {
  category?: string;
  description?: string;
  is_public?: boolean;
}) => {
  const response = await api.put<Portfolio>(`/portfolio/${id}`, data);
  return response.data;
};

export const deleteFromPortfolio = async (id: number) => {
  await api.delete(`/portfolio/${id}`);
};

// Master Photos
export const getMasterPhotos = async () => {
  const response = await api.get<MasterPhoto[]>('/masters/photos');
  return response.data;
};

export const getMasterPhoto = async (masterName: string) => {
  const response = await api.get<MasterPhoto>(`/masters/${masterName}/photo`);
  return response.data;
};

export const addMasterPhoto = async (masterName: string, fileId: string) => {
  const response = await api.post<MasterPhoto>(`/masters/${masterName}/photo`, null, {
    params: { file_id: fileId },
  });
  return response.data;
};

// Chat Messages
export const getChatHistory = async (chatId: number, limit: number = 50) => {
  const response = await api.get<ChatMessage[]>(`/chat/${chatId}`, {
    params: { limit },
  });
  return response.data;
};

export const sendChatMessage = async (chatId: number, message: string, isFromClient: boolean) => {
  const response = await api.post<ChatMessage>('/chat', {
    chat_id: chatId,
    message,
    is_from_client: isFromClient,
  });
  return response.data;
};

// Clients
export const getClients = async () => {
  const response = await api.get<Client[]>('/clients');
  return response.data;
};

export const getClient = async (chatId: number) => {
  const response = await api.get<Client>(`/clients/${chatId}`);
  return response.data;
};

export const updateClientNotes = async (chatId: number, notes: string) => {
  const response = await api.put<Client>(`/clients/${chatId}`, null, {
    params: { notes },
  });
  return response.data;
};

export const getLoyaltyStatus = async (chatId: number) => {
  const response = await api.get<LoyaltyStatus>(`/clients/${chatId}/loyalty`);
  return response.data;
};

// Booking Reschedule
export const rescheduleBooking = async (data: {
  booking_id: number;
  new_date: string;
  new_time: string;
  reason?: string;
}) => {
  const response = await api.post('/bookings/reschedule', data);
  return response.data;
};

// Cancel Booking
export const cancelBooking = async (id: number) => {
  const response = await api.delete(`/bookings/${id}`);
  return response.data;
};

// Notifications
export const getPendingNotifications = async () => {
  const response = await api.get('/notifications/pending');
  return response.data;
};

export const createNotification = async (data: {
  chat_id: number;
  notification_type: string;
  message: string;
  send_at: string;
  booking_id?: number;
}) => {
  const response = await api.post('/notifications', data);
  return response.data;
};

export const sendNotification = async (notificationId: number) => {
  const response = await api.post(`/notifications/${notificationId}/send`);
  return response.data;
};

// Utils
export const initTelegramWebApp = () => {
  const tg = (window as any).Telegram.WebApp;
  tg.ready();
  tg.expand();

  // Настраиваем цвета под тему Telegram
  document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
  document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
  document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
  document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#2481cc');
  document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
  document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
  document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f0f0f0');

  return tg;
};

export const getTelegramUser = () => {
  const tg = (window as any).Telegram.WebApp;
  return tg.initDataUnsafe?.user;
};

export const getTelegramInitData = () => {
  const tg = (window as any).Telegram.WebApp;
  return tg.initData;
};

export const parseTelegramInitData = (initData: string) => {
  const params = new URLSearchParams(initData);
  const user = params.get('user');
  const hash = params.get('hash');
  const authDate = params.get('auth_date');

  if (!user || !hash || !authDate) {
    return null;
  }

  return {
    ...JSON.parse(user),
    hash,
    auth_date: parseInt(authDate, 10),
  };
};
