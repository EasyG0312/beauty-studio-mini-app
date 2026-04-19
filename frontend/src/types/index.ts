export interface Notification {
  id: number;
  chat_id: number;
  notification_type: string;
  message: string;
  send_at: string;
  sent: boolean;
  sent_at?: string;
  booking_id?: number;
}

export interface Booking {
  id: number;
  name: string;
  phone: string;
  service: string;
  master: string;
  date: string;
  time: string;
  comment: string;
  chat_id?: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  actual_amount?: number;
  is_reschedule: boolean;
  is_on_the_way: boolean;
  reminded_1d: boolean;
  reminded_3d: boolean;
  reminded_1h: boolean;
  review_sent: boolean;
  cancel_reason?: string;
  created_at: string;
}

export interface BookingCreate {
  name: string;
  phone: string;
  service: string;
  master: string;
  date: string;
  time: string;
  comment?: string;
  chat_id?: number;
  is_reschedule?: boolean;
  old_booking_id?: number;
}

export interface BookingReschedule {
  booking_id: number;
  new_date: string;
  new_time: string;
  reason?: string;
}

export interface LoyaltyStatus {
  chat_id: number;
  visit_count: number;
  is_loyal: boolean;
  discount_percent: number;
  next_reward_at: number;
  total_saved: number;
}

export interface Client {
  chat_id: number;
  name: string;
  phone: string;
  first_visit: string;
  last_visit: string;
  visit_count: number;
  is_loyal: boolean;
  notes?: string;
  rfm_segment: string;
  rfm_score: number;
}

export interface Review {
  id: number;
  booking_id: number;
  chat_id: number;
  rating: number;
  comment?: string;
  created_at: string;
  client_name?: string;
  service?: string;
  master?: string;
}

export interface Waitlist {
  id: number;
  chat_id: number;
  name: string;
  phone: string;
  date: string;
  time: string;
  master: string;
  service: string;
  created_at: string;
}

export interface Blacklist {
  chat_id: number;
  name: string;
  phone: string;
  reason: string;
  no_show_count: number;
  added_at: string;
  added_by: number;
}

export interface Portfolio {
  id: number;
  file_id: string;
  added_at: string;
  category: string;
  description?: string;
  master?: string;
  is_public: boolean;
}

export interface MasterPhoto {
  master: string;
  file_id: string;
  photo_url?: string;
  added_at: string;
}

export interface ChatMessage {
  id: number;
  chat_id: number;
  message: string;
  is_from_client: boolean;
  created_at: string;
}

export interface SlotAvailability {
  date: string;
  master: string;
  available_slots: string[];
  booked_slots: string[];
}

export interface AnalyticsSummary {
  total_clients: number;
  loyal_clients: number;
  today_bookings: number;
  week_bookings: number;
  total_bookings: number;
  revenue_7d: number;
  revenue_30d: number;
  avg_rating: number;
  confirmed: number;
  cancelled: number;
  no_show: number;
}

export interface MasterKPI {
  master: string;
  completed: number;
  cancelled: number;
  no_show: number;
  revenue: number;
  avg_rating: number;
  conversion: number;
  avg_check: number;
}

export interface ClientRFM {
  chat_id: number;
  name: string;
  phone: string;
  rfm_segment: string;
  rfm_score: number;
  visit_count: number;
  last_visit: string;
  total_spent: number;
}

export interface RevenueForecast {
  days: number;
  forecast: number;
  confidence: number;
}

export interface FunnelStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
  conversion_rate: number;
}

export interface DailyStats {
  date: string;
  bookings: number;
  completed: number;
  revenue: number;
  avg_check: number;
}

export interface HourlyHeatmap {
  day_of_week: number;
  hour: string;
  bookings_count: number;
  utilization_percent: number;
}

export interface ComparisonStats {
  current_period: number;
  previous_period: number;
  change_percent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface MasterPerformance {
  master: string;
  bookings_count: number;
  completed_count: number;
  revenue: number;
  avg_rating: number;
  conversion_rate: number;
  avg_check: number;
}

export interface AnalyticsDashboard {
  period_days: number;
  total_revenue: number;
  total_bookings: number;
  completed_bookings: number;
  conversion_rate: number;
  avg_check: number;
  new_clients: number;
  returning_clients: number;
  top_services: { name: string; count: number }[];
  daily_stats: DailyStats[];
  funnel: FunnelStats;
  master_performance: MasterPerformance[];
}

export type UserRole = 'client' | 'manager' | 'owner';

export interface AuthMeResponse {
  chat_id: number;
  role: UserRole;
  name: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: number;
    role: UserRole;
    telegramUser?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
  } | null;
  token: string | null;
}

export interface Service {
  name: string;
  price: string;
  priceNum: number;
}

export interface MasterAvailability {
  master: string;
  date: string;
  is_available: boolean;
  is_working?: boolean;  // добавлено для удобства
  reason?: string;
  schedule?: MasterSchedule;
  time_off?: MasterTimeOff;
}

export interface MasterSchedule {
  id: number;
  master: string;
  day_of_week: number;  // 0=Пн, ..., 6=Вс
  start_time: string;  // "09:00"
  end_time: string;  // "20:00"
  is_working: boolean;
  is_active: boolean;
}

export interface MasterTimeOff {
  id: number;
  master: string;
  start_date: string;  // DD.MM.YYYY
  end_date: string;  // DD.MM.YYYY
  reason: string;  // vacation, sick, personal, holiday
  comment: string;
  is_active: boolean;
}

export interface Master {
  id: string;
  name: string;
  spec: string;
  photo_id?: string;
}

export interface PromoCode {
  id: number;
  code: string;
  discount_percent: number;
  discount_amount: number;
  min_booking_amount: number;
  valid_from: string;
  valid_until: string;
  usage_limit: number;
  usage_count: number;
  is_active: boolean;
  created_at: string;
}

export interface PromoCodeValidationResult {
  valid: boolean;
  error?: string;
  discount_percent: number;
  discount_amount: number;
}

export const CANCEL_REASONS = [
  'Передумал',
  'Неудобное время',
  'Нашёл другого мастера',
  'Болезнь',
  'Другое',
];

export const FAQ_ITEMS: Record<string, string> = {
  'Принимаете карты?': 'Да — Visa, MasterCard, Элкарт.',
  'Есть парковка?': 'Нет, парковка отсутствует.',
  'Нужна запись?': 'Рекомендуем записываться заранее.',
  'Есть скидки?': 'При первом визите скидка 10%. После 5 визитов — постоянная скидка 10%!',
};
