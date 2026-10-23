import { apiRequest } from '@/api/client';
import type { BookingResponse, BookingWithSession } from '@/types/bookings';

export async function getBooking(bookingId: string): Promise<BookingWithSession> {
  const { booking } = await apiRequest<BookingResponse>(`/bookings/${encodeURIComponent(bookingId)}`);
  return booking;
}
