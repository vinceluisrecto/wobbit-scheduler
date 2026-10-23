import { updatePayment as updatePaymentInDb } from '../../repositories/admin';
import type { BookingWithSession, PaymentStatus } from '../../types/bookings';
import { BookingNotFoundError } from '../../utils/errors';

export async function updatePayment(bookingId: string, status: PaymentStatus): Promise<BookingWithSession> {
  const booking = await updatePaymentInDb(bookingId, status);
  if (!booking) throw new BookingNotFoundError();
  return booking;
}
