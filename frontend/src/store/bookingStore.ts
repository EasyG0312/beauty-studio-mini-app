import { create } from 'zustand';
import type { Booking } from '../types';
import { getBookings, createBooking, updateBooking } from '../services/api';
import type { BookingCreate } from '../types';

interface BookingState {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  
  fetchBookings: (params?: { status_filter?: string; date?: string; chat_id?: number }) => Promise<void>;
  addBooking: (booking: BookingCreate) => Promise<Booking>;
  updateBookingStatus: (id: number, status: Booking['status']) => Promise<Booking>;
  cancelBooking: (id: number) => Promise<void>;
}

export const useBookingStore = create<BookingState>((set) => ({
  bookings: [],
  loading: false,
  error: null,
  
  fetchBookings: async (params) => {
    set({ loading: true, error: null });
    try {
      console.log('bookingStore: Fetching bookings with params', params);
      const bookings = await getBookings(params);
      console.log('bookingStore: Received bookings', bookings);
      set({ bookings, loading: false });
    } catch (error) {
      console.error('bookingStore: Error fetching bookings', error);
      set({ error: 'Failed to fetch bookings', loading: false });
    }
  },
  
  addBooking: async (booking: BookingCreate) => {
    const newBooking = await createBooking(booking);
    set((state) => ({
      bookings: [...state.bookings, newBooking],
    }));
    return newBooking;
  },
  
  updateBookingStatus: async (id: number, status: Booking['status']) => {
    const updated = await updateBooking(id, { status } as Partial<Booking>);
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === id ? { ...b, status } : b
      ),
    }));
    return updated;
  },
  
  cancelBooking: async (id: number) => {
    await updateBooking(id, { status: 'cancelled' });
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === id ? { ...b, status: 'cancelled' } : b
      ),
    }));
  },
}));
