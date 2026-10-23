import { pool } from '../../db/client';
import type { BookingWithSession, PaymentStatus } from '../../types/bookings';
import { BOOKING_SELECT, toBookingWithSession, type BookingRow } from '../bookings';

// §6 Payment: one UPDATE that sets or clears paid_at. Returns null when the booking doesn't exist.
export async function updatePayment(bookingId: string, status: PaymentStatus): Promise<BookingWithSession | null> {
  const updated = await pool.query(
    `UPDATE bookings
        SET payment_status = $2, paid_at = CASE WHEN $2 = 'paid' THEN now() ELSE NULL END
      WHERE id = $1
     RETURNING id`,
    [bookingId, status],
  );
  if (updated.rowCount === 0) return null;

  const { rows } = await pool.query<BookingRow>(`${BOOKING_SELECT} WHERE b.id = $1`, [bookingId]);
  return toBookingWithSession(rows[0]);
}
