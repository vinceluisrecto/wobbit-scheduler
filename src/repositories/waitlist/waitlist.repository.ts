import type { Pool, PoolClient } from 'pg';
import { pool } from '../../db/client';
import { isUniqueViolation, refuse, succeed, withTransaction, type TxResult } from '../../db/transaction';
import type { EmailRecipient } from '../../types/email';
import type { WaitlistEntryWithSession } from '../../types/waitlist';
import { WAITLIST_SELECT, toWaitlistEntryWithSession, toWaitlistOwner, type WaitlistRow } from './waitlist.mapper';

export interface WaitlistRecord {
  entry: WaitlistEntryWithSession;
  owner: EmailRecipient;
}

export type JoinWaitlistRefusal =
  | 'SESSION_NOT_FOUND'
  | 'SESSION_PAST'
  | 'SESSION_NOT_FULL'
  | 'ALREADY_BOOKED'
  | 'ALREADY_WAITLISTED';

async function findWaitlistRecord(id: string, db: Pool | PoolClient): Promise<WaitlistRecord | null> {
  const { rows } = await db.query<WaitlistRow>(`${WAITLIST_SELECT} WHERE w.id = $1`, [id]);
  return rows[0] ? { entry: toWaitlistEntryWithSession(rows[0]), owner: toWaitlistOwner(rows[0]) } : null;
}

export function findWaitlistEntryById(id: string): Promise<WaitlistRecord | null> {
  return findWaitlistRecord(id, pool);
}

// My bookings shows waiting entries and the "You got a place!" ones for upcoming classes.
export async function listUpcomingWaitlistByUser(userId: string): Promise<WaitlistEntryWithSession[]> {
  const { rows } = await pool.query<WaitlistRow>(
    `${WAITLIST_SELECT}
      WHERE w.user_id = $1 AND w.status IN ('waiting', 'promoted') AND s.starts_at > now()
      ORDER BY s.starts_at, w.created_at`,
    [userId],
  );
  return rows.map(toWaitlistEntryWithSession);
}

// §6 Join waitlist: lock the session row, check the rules, insert.
export function joinWaitlist(
  sessionId: string,
  userId: string,
): Promise<TxResult<WaitlistRecord, JoinWaitlistRefusal>> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ is_past: boolean; has_space: boolean }>(
      `SELECT starts_at <= now() AS is_past, booked_count < capacity AS has_space
         FROM sessions WHERE id = $1 FOR UPDATE`,
      [sessionId],
    );
    if (rows.length === 0) return refuse('SESSION_NOT_FOUND');
    if (rows[0].is_past) return refuse('SESSION_PAST');

    const booked = await client.query(
      `SELECT 1 FROM bookings WHERE session_id = $1 AND user_id = $2 AND status = 'confirmed'`,
      [sessionId, userId],
    );
    if (booked.rowCount !== 0) return refuse('ALREADY_BOOKED');
    if (rows[0].has_space) return refuse('SESSION_NOT_FULL');

    let entryId: string;
    try {
      const inserted = await client.query<{ id: string }>(
        'INSERT INTO waitlist_entries (session_id, user_id) VALUES ($1, $2) RETURNING id',
        [sessionId, userId],
      );
      entryId = inserted.rows[0].id;
    } catch (error) {
      if (isUniqueViolation(error)) return refuse('ALREADY_WAITLISTED');
      throw error;
    }

    return succeed((await findWaitlistRecord(entryId, client))!);
  });
}

// Leave or remove: only a waiting entry can be removed. Returns false when nothing changed.
export async function removeWaitlistEntry(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE waitlist_entries SET status = 'removed', updated_at = now() WHERE id = $1 AND status = 'waiting'`,
    [id],
  );
  return rowCount !== 0;
}
