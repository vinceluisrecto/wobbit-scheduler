import type { Pool, PoolClient } from 'pg';
import { pool } from '../../db/client';
import { refuse, succeed, withTransaction, type TxResult } from '../../db/transaction';
import type { AdminSessionDetailResponse, AdminSessionScope, AdminSessionSummary, SessionInput } from '../../types/admin';
import type { SessionSummary } from '../../types/sessions';
import { BOOKING_SELECT, toBooking, toBookingOwner, type BookingRow } from '../bookings';
import { toSessionSummary, type SessionRow } from '../sessions';
import { WAITLIST_SELECT, promoteFromWaitlist, toWaitlistEntry, type PromotedBooking, type WaitlistRow } from '../waitlist';
import { ADMIN_SESSION_SELECT, toAdminSessionSummary, type AdminSessionRow } from './admin-session.mapper';

async function findAdminSession(id: string, db: Pool | PoolClient): Promise<AdminSessionSummary | null> {
  const { rows } = await db.query<AdminSessionRow>(`${ADMIN_SESSION_SELECT} WHERE s.id = $1`, [id]);
  return rows[0] ? toAdminSessionSummary(rows[0]) : null;
}

// upcoming: soonest first. past: most recent first.
export async function listAdminSessions(scope: AdminSessionScope): Promise<AdminSessionSummary[]> {
  const query =
    scope === 'upcoming'
      ? `${ADMIN_SESSION_SELECT} WHERE s.starts_at > now() ORDER BY s.starts_at ASC, s.id`
      : `${ADMIN_SESSION_SELECT} WHERE s.starts_at <= now() ORDER BY s.starts_at DESC, s.id`;
  const { rows } = await pool.query<AdminSessionRow>(query);
  return rows.map(toAdminSessionSummary);
}

export async function createSession(input: SessionInput): Promise<AdminSessionSummary> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO sessions (title, instructor, starts_at, duration_minutes, capacity, price_cents)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [input.title, input.instructor, input.startsAt, input.durationMinutes, input.capacity, input.priceCents],
  );
  return (await findAdminSession(rows[0].id, pool))!;
}

// The class, its roster (confirmed first, then cancelled, each by booking time) and its waiting list in order.
export async function getSessionDetail(id: string): Promise<AdminSessionDetailResponse | null> {
  const session = await findAdminSession(id, pool);
  if (!session) return null;

  const [bookings, waitlist] = await Promise.all([
    pool.query<BookingRow>(
      `${BOOKING_SELECT} WHERE b.session_id = $1 ORDER BY (b.status = 'cancelled'), b.created_at, b.id`,
      [id],
    ),
    pool.query<WaitlistRow>(
      `${WAITLIST_SELECT} WHERE w.session_id = $1 AND w.status = 'waiting' ORDER BY w.created_at, w.id`,
      [id],
    ),
  ]);

  return { session, bookings: bookings.rows.map(toBooking), waitlist: waitlist.rows.map(toWaitlistEntry) };
}

export type UpdateSessionRefusal = 'SESSION_NOT_FOUND' | 'SESSION_PAST' | 'CAPACITY_BELOW_BOOKINGS';

export interface UpdatedSession {
  previous: SessionSummary; // before the edit, to tell which fields changed
  session: AdminSessionSummary; // after the edit and any promotion
  confirmed: PromotedBooking[]; // members booked before the edit (E6 recipients)
  promoted: PromotedBooking[]; // booked from the waitlist by a capacity increase (E4)
}

// §6 Edit: lock the session row first, then the guarded UPDATE. Raising capacity promotes
// from the waitlist inside the same transaction.
export function updateSession(
  id: string,
  changes: Partial<SessionInput>,
): Promise<TxResult<UpdatedSession, UpdateSessionRefusal>> {
  return withTransaction(async (client) => {
    const locked = await client.query<SessionRow & { is_past: boolean }>(
      'SELECT *, starts_at <= now() AS is_past FROM sessions WHERE id = $1 FOR UPDATE',
      [id],
    );
    if (locked.rows.length === 0) return refuse('SESSION_NOT_FOUND');
    const previous = locked.rows[0];

    const updated = await client.query(
      `UPDATE sessions
          SET title = COALESCE($2, title),
              instructor = COALESCE($3, instructor),
              starts_at = COALESCE($4, starts_at),
              duration_minutes = COALESCE($5, duration_minutes),
              capacity = COALESCE($6, capacity),
              price_cents = COALESCE($7, price_cents),
              updated_at = now()
        WHERE id = $1 AND starts_at > now() AND booked_count <= COALESCE($6, capacity)
       RETURNING id`,
      [
        id,
        changes.title ?? null,
        changes.instructor ?? null,
        changes.startsAt ?? null,
        changes.durationMinutes ?? null,
        changes.capacity ?? null,
        changes.priceCents ?? null,
      ],
    );
    if (updated.rowCount === 0) return refuse(previous.is_past ? 'SESSION_PAST' : 'CAPACITY_BELOW_BOOKINGS');

    const confirmed = await client.query<BookingRow>(
      `${BOOKING_SELECT} WHERE b.session_id = $1 AND b.status = 'confirmed' ORDER BY b.created_at`,
      [id],
    );
    const capacityRaised = changes.capacity !== undefined && changes.capacity > previous.capacity;
    const promoted = capacityRaised ? await promoteFromWaitlist(client, id) : [];

    return succeed({
      previous: toSessionSummary(previous),
      session: (await findAdminSession(id, client))!,
      confirmed: confirmed.rows.map((row) => ({ booking: toBooking(row), owner: toBookingOwner(row) })),
      promoted,
    });
  });
}

// node-postgres error code for a foreign-key violation.
function isForeignKeyViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23503';
}

// §6 Delete: only a class that never had a booking or waitlist row. The session is locked
// first so a booking committing at the same moment is seen; the FKs are a second guard.
export function deleteSession(id: string): Promise<TxResult<null, 'SESSION_NOT_FOUND' | 'SESSION_HAS_BOOKINGS'>> {
  return withTransaction(async (client) => {
    const locked = await client.query('SELECT id FROM sessions WHERE id = $1 FOR UPDATE', [id]);
    if (locked.rowCount === 0) return refuse('SESSION_NOT_FOUND');

    try {
      const deleted = await client.query(
        `DELETE FROM sessions WHERE id = $1
            AND NOT EXISTS (SELECT 1 FROM bookings WHERE session_id = $1)
            AND NOT EXISTS (SELECT 1 FROM waitlist_entries WHERE session_id = $1)
         RETURNING id`,
        [id],
      );
      if (deleted.rowCount === 0) return refuse('SESSION_HAS_BOOKINGS');
    } catch (error) {
      if (isForeignKeyViolation(error)) return refuse('SESSION_HAS_BOOKINGS');
      throw error;
    }
    return succeed(null);
  });
}
