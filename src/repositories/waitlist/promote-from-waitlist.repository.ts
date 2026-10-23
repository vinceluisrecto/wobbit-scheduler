import type { PoolClient } from 'pg';
import type { Booking } from '../../types/bookings';
import type { EmailRecipient } from '../../types/email';
import { BOOKING_SELECT, toBooking, toBookingOwner, type BookingRow } from '../bookings/booking.mapper';

export interface PromotedBooking {
  booking: Booking;
  owner: EmailRecipient;
}

// §6: fills free places from the waitlist, first come first served.
// Runs inside the caller's transaction, which must already hold the session's row lock.
// Never opens or commits a transaction itself.
export async function promoteFromWaitlist(client: PoolClient, sessionId: string): Promise<PromotedBooking[]> {
  const promoted: PromotedBooking[] = [];

  for (;;) {
    const next = await client.query<{ id: string; user_id: string }>(
      `SELECT w.id, w.user_id FROM waitlist_entries w
        WHERE w.session_id = $1 AND w.status = 'waiting'
          AND NOT EXISTS (SELECT 1 FROM bookings b
                           WHERE b.session_id = $1 AND b.user_id = w.user_id AND b.status = 'confirmed')
        ORDER BY w.created_at, w.id
        LIMIT 1
        FOR UPDATE`,
      [sessionId],
    );
    if (next.rows.length === 0) break;
    const entry = next.rows[0];

    const seat = await client.query(
      `UPDATE sessions SET booked_count = booked_count + 1, updated_at = now()
        WHERE id = $1 AND booked_count < capacity
       RETURNING id`,
      [sessionId],
    );
    if (seat.rowCount === 0) break;

    const inserted = await client.query<{ id: string }>(
      'INSERT INTO bookings (session_id, user_id) VALUES ($1, $2) RETURNING id',
      [sessionId, entry.user_id],
    );
    const bookingId = inserted.rows[0].id;
    await client.query(
      `UPDATE waitlist_entries SET status = 'promoted', booking_id = $2, updated_at = now() WHERE id = $1`,
      [entry.id, bookingId],
    );

    const { rows } = await client.query<BookingRow>(`${BOOKING_SELECT} WHERE b.id = $1`, [bookingId]);
    promoted.push({ booking: toBooking(rows[0]), owner: toBookingOwner(rows[0]) });
  }

  return promoted;
}
