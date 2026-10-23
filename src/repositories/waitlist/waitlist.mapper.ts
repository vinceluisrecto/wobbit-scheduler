import type { EmailRecipient } from '../../types/email';
import type { WaitlistEntry, WaitlistEntryWithSession, WaitlistStatus } from '../../types/waitlist';
import { toIsoString } from '../../utils/to-iso-string';
import { toSessionSummary, type SessionRow } from '../sessions';

// One waitlist entry with its owner, its class and its live position. Add WHERE / ORDER BY after it.
// Position = 1 + waiting entries in the same class that joined earlier (id breaks ties).
export const WAITLIST_SELECT = `
  SELECT w.*, u.name, u.email, u.time_zone, row_to_json(s) AS session,
         CASE WHEN w.status = 'waiting' THEN (
           SELECT count(*)::int + 1 FROM waitlist_entries e
            WHERE e.session_id = w.session_id AND e.status = 'waiting'
              AND (e.created_at, e.id) < (w.created_at, w.id)
         ) END AS position
    FROM waitlist_entries w
    JOIN users u ON u.id = w.user_id
    JOIN sessions s ON s.id = w.session_id`;

export interface WaitlistRow {
  id: string;
  session_id: string;
  user_id: string;
  name: string;
  email: string;
  time_zone: string;
  status: WaitlistStatus;
  position: number | null;
  booking_id: string | null;
  created_at: Date;
  session: SessionRow;
}

export function toWaitlistEntry(row: WaitlistRow): WaitlistEntry {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    status: row.status,
    position: row.position,
    bookingId: row.booking_id,
    createdAt: toIsoString(row.created_at),
  };
}

export function toWaitlistEntryWithSession(row: WaitlistRow): WaitlistEntryWithSession {
  return { ...toWaitlistEntry(row), session: toSessionSummary(row.session) };
}

export function toWaitlistOwner(row: WaitlistRow): EmailRecipient {
  return { name: row.name, email: row.email, timeZone: row.time_zone };
}
