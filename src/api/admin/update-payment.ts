import { apiRequest } from '@/api/client';
import type { UpdatePaymentRequest } from '@/types/admin';
import type { BookingResponse, BookingWithSession, PaymentStatus } from '@/types/bookings';

export async function updatePayment(bookingId: string, paymentStatus: PaymentStatus): Promise<BookingWithSession> {
  const body: UpdatePaymentRequest = { paymentStatus };
  const { booking } = await apiRequest<BookingResponse>(`/admin/bookings/${encodeURIComponent(bookingId)}/payment`, {
    method: 'PATCH',
    body,
  });
  return booking;
}
