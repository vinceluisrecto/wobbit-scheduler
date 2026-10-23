import { apiRequest } from '@/api/client';
import type { BookingResponse, BookingWithSession } from '@/types/bookings';

/** Cancels a booking. The same endpoint serves the owner and admins (D15). */
export async function cancelBooking(bookingId: string): Promise<BookingWithSession> {
  const { booking } = await apiRequest<BookingResponse>(`/bookings/${encodeURIComponent(bookingId)}/cancel`, {
    method: 'POST',
  });
  return booking;
}
