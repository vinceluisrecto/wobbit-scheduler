import type { AdminSessionSummary } from '../../types/admin';
import { toSessionSummary, type SessionRow } from '../sessions';

// A class with its admin counts, in one query (subqueries, no N+1). Add WHERE / ORDER BY after it.
export const ADMIN_SESSION_SELECT = `
  SELECT s.*,
         (SELECT count(*)::int FROM bookings b
           WHERE b.session_id = s.id AND b.status = 'confirmed' AND b.payment_status = 'paid') AS paid_count,
         (SELECT count(*)::int FROM waitlist_entries w
           WHERE w.session_id = s.id AND w.status = 'waiting') AS waitlist_count,
         (SELECT count(*)::int FROM bookings b
           WHERE b.session_id = s.id AND b.status = 'cancelled' AND b.payment_status = 'paid') AS refund_due_count
    FROM sessions s`;

export interface AdminSessionRow extends SessionRow {
  paid_count: number;
  waitlist_count: number;
  refund_due_count: number;
}

export function toAdminSessionSummary(row: AdminSessionRow): AdminSessionSummary {
  return {
    ...toSessionSummary(row),
    bookedCount: row.booked_count,
    paidCount: row.paid_count,
    waitlistCount: row.waitlist_count,
    refundDueCount: row.refund_due_count,
  };
}
