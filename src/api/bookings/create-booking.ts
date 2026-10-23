import { apiRequest } from '@/api/client';
import type { BookingResponse, BookingWithSession } from '@/types/bookings';

/** Books one place for the logged-in member. */
export async function createBooking(sessionId: string): Promise<BookingWithSession> {
  const { booking } = await apiRequest<BookingResponse>(`/sessions/${encodeURIComponent(sessionId)}/bookings`, {
    method: 'POST',
  });
  return booking;
}
