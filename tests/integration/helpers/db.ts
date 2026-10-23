import { pool } from '../../../src/db/client';

// Integration tests wipe tables, so they only ever run against a *_test database (D3).
export async function resetDatabase(): Promise<void> {
  const { rows } = await pool.query<{ name: string }>('SELECT current_database() AS name');
  if (!rows[0].name.endsWith('_test')) {
    throw new Error(`Refusing to reset "${rows[0].name}". Set TEST_DATABASE_URL to a *_test database.`);
  }
  await pool.query('TRUNCATE waitlist_entries, bookings, sessions, password_reset_tokens, user_sessions, users');
}

interface SessionOptions {
  title?: string;
  instructor?: string;
  startsInHours?: number; // negative = already started
  capacity?: number;
  priceCents?: number;
}

export async function insertSession(options: SessionOptions = {}): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO sessions (title, instructor, starts_at, duration_minutes, capacity, price_cents)
     VALUES ($1, $2, now() + $3 * interval '1 hour', 60, $4, $5) RETURNING id`,
    [
      options.title ?? 'Test Class',
      options.instructor ?? 'Test Instructor',
      options.startsInHours ?? 24,
      options.capacity ?? 10,
      options.priceCents ?? 1500,
    ],
  );
  return rows[0].id;
}

// Inserts a confirmed booking directly (keeps booked_count in step).
export async function insertBooking(sessionId: string, userId: string, paid = false): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO bookings (session_id, user_id, payment_status, paid_at)
     VALUES ($1, $2, $3, CASE WHEN $4 THEN now() END) RETURNING id`,
    [sessionId, userId, paid ? 'paid' : 'unpaid', paid],
  );
  await pool.query('UPDATE sessions SET booked_count = booked_count + 1 WHERE id = $1', [sessionId]);
  return rows[0].id;
}

// The seat invariant every mutating test must leave behind.
export async function expectSeatInvariant(): Promise<void> {
  const { rows } = await pool.query(
    `SELECT s.id, s.booked_count, s.capacity,
            (SELECT count(*)::int FROM bookings b WHERE b.session_id = s.id AND b.status = 'confirmed') AS confirmed
       FROM sessions s`,
  );
  for (const row of rows) {
    expect(row.booked_count).toBe(row.confirmed);
    expect(row.booked_count).toBeLessThanOrEqual(row.capacity);
  }
}

// Inserts a waiting entry that joined `joinedMinutesAgo` minutes ago (sets the queue order).
export async function insertWaitlistEntry(sessionId: string, userId: string, joinedMinutesAgo = 0): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO waitlist_entries (session_id, user_id, created_at)
     VALUES ($1, $2, now() - $3 * interval '1 minute') RETURNING id`,
    [sessionId, userId, joinedMinutesAgo],
  );
  return rows[0].id;
}

// Cancels a confirmed booking directly (keeps booked_count in step), for setting up history.
export async function cancelBookingDirectly(bookingId: string, by: 'member' | 'admin' = 'member'): Promise<void> {
  const { rows } = await pool.query<{ session_id: string }>(
    `UPDATE bookings SET status = 'cancelled', cancelled_at = now(), cancelled_by = $2
      WHERE id = $1 AND status = 'confirmed' RETURNING session_id`,
    [bookingId, by],
  );
  await pool.query('UPDATE sessions SET booked_count = booked_count - 1 WHERE id = $1', [rows[0].session_id]);
}
