import type { Pool, PoolClient } from 'pg';
import { pool } from '../../db/client';
import { isUniqueViolation, refuse, succeed, withTransaction, type TxResult } from '../../db/transaction';
import type { BookingWithSession } from '../../types/bookings';
import type { EmailRecipient } from '../../types/email';
import { promoteFromWaitlist, type PromotedBooking } from '../waitlist/promote-from-waitlist.repository';
import { BOOKING_SELECT, toBookingOwner, toBookingWithSession, type BookingRow } from './booking.mapper';

export interface BookingRecord {
  booking: BookingWithSession;
  owner: EmailRecipient;
}

export type CreateBookingRefusal = 'SESSION_NOT_FOUND' | 'SESSION_PAST' | 'SESSION_FULL' | 'ALREADY_BOOKED';
export type CancelBookingRefusal = 'BOOKING_NOT_FOUND' | 'SESSION_PAST' | 'BOOKING_ALREADY_CANCELLED';

async function findBookingRecord(id: string, db: Pool | PoolClient): Promise<BookingRecord | null> {
  const { rows } = await db.query<BookingRow>(`${BOOKING_SELECT} WHERE b.id = $1`, [id]);
  return rows[0] ? { booking: toBookingWithSession(rows[0]), owner: toBookingOwner(rows[0]) } : null;
}

export function findBookingById(id: string): Promise<BookingRecord | null> {
  return findBookingRecord(id, pool);
}

export async function listBookingsByUser(userId: string, scope: 'upcoming' | 'past'): Promise<BookingWithSession[]> {
  const filter = scope === 'upcoming' ? 's.starts_at > now()' : 's.starts_at <= now()';
  const order = scope === 'upcoming' ? 's.starts_at ASC' : 's.starts_at DESC';
  const { rows } = await pool.query<BookingRow>(
    `${BOOKING_SELECT} WHERE b.user_id = $1 AND ${filter} ORDER BY ${order}, b.created_at`,
    [userId],
  );
  return rows.map(toBookingWithSession);
}

// After the seat UPDATE matched nothing: work out which rule refused it.
async function whyBookingRefused(client: PoolClient, sessionId: string, userId: string): Promise<CreateBookingRefusal> {
  const { rows } = await client.query<{ is_past: boolean; already_booked: boolean }>(
    `SELECT s.starts_at <= now() AS is_past,
            EXISTS (SELECT 1 FROM bookings b
                     WHERE b.session_id = s.id AND b.user_id = $2 AND b.status = 'confirmed') AS already_booked
       FROM sessions s WHERE s.id = $1`,
    [sessionId, userId],
  );
  if (rows.length === 0) return 'SESSION_NOT_FOUND';
  if (rows[0].is_past) return 'SESSION_PAST';
  if (rows[0].already_booked) return 'ALREADY_BOOKED';
  return 'SESSION_FULL';
}

// §6 Book: the conditional UPDATE takes the session's row lock, so at most `capacity` bookings succeed.
export function createBooking(
  sessionId: string,
  userId: string,
): Promise<TxResult<BookingRecord, CreateBookingRefusal>> {
  return withTransaction(async (client) => {
    const seat = await client.query(
      `UPDATE sessions SET booked_count = booked_count + 1, updated_at = now()
        WHERE id = $1 AND booked_count < capacity AND starts_at > now()
       RETURNING id`,
      [sessionId],
    );
    if (seat.rowCount === 0) return refuse(await whyBookingRefused(client, sessionId, userId));

    let bookingId: string;
    try {
      const { rows } = await client.query<{ id: string }>(
        'INSERT INTO bookings (session_id, user_id) VALUES ($1, $2) RETURNING id',
        [sessionId, userId],
      );
      bookingId = rows[0].id;
    } catch (error) {
      if (isUniqueViolation(error)) return refuse('ALREADY_BOOKED'); // rolled back, so the increment is undone
      throw error;
    }

    return succeed((await findBookingRecord(bookingId, client))!);
  });
}

export interface CancelledBookingRecord extends BookingRecord {
  promoted: PromotedBooking[];
}

// §6 Cancel: lock the session first, cancel, free the seat, then promote from the waitlist
// in the same transaction so nobody else can take the place first.
export function cancelBooking(
  bookingId: string,
  cancelledBy: 'member' | 'admin',
): Promise<TxResult<CancelledBookingRecord, CancelBookingRefusal>> {
  return withTransaction(async (client) => {
    const found = await client.query<{ session_id: string }>('SELECT session_id FROM bookings WHERE id = $1', [
      bookingId,
    ]);
    if (found.rows.length === 0) return refuse('BOOKING_NOT_FOUND');
    const sessionId = found.rows[0].session_id;

    const session = await client.query<{ is_past: boolean }>(
      'SELECT starts_at <= now() AS is_past FROM sessions WHERE id = $1 FOR UPDATE',
      [sessionId],
    );
    if (session.rows[0].is_past) return refuse('SESSION_PAST');

    const cancelled = await client.query(
      `UPDATE bookings SET status = 'cancelled', cancelled_at = now(), cancelled_by = $2
        WHERE id = $1 AND status = 'confirmed'
       RETURNING id`,
      [bookingId, cancelledBy],
    );
    if (cancelled.rowCount === 0) return refuse('BOOKING_ALREADY_CANCELLED');

    await client.query('UPDATE sessions SET booked_count = booked_count - 1, updated_at = now() WHERE id = $1', [
      sessionId,
    ]);
    const promoted = await promoteFromWaitlist(client, sessionId);

    const record = (await findBookingRecord(bookingId, client))!;
    return succeed({ ...record, promoted });
  });
}
