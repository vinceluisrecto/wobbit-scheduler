import type { Booking, BookingStatus, BookingWithSession, PaymentStatus } from '../../types/bookings';
import type { EmailRecipient } from '../../types/email';
import { toIsoString, toIsoStringOrNull } from '../../utils/to-iso-string';
import { toSessionSummary, type SessionRow } from '../sessions';

// One booking with its owner and its class, in a single query. Add WHERE / ORDER BY after it.
export const BOOKING_SELECT = `
  SELECT b.*, u.name, u.email, u.time_zone, row_to_json(s) AS session
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    JOIN sessions s ON s.id = b.session_id`;

export interface BookingRow {
  id: string;
  session_id: string;
  user_id: string;
  name: string;
  email: string;
  time_zone: string;
  status: BookingStatus;
  cancelled_at: Date | null;
  cancelled_by: 'member' | 'admin' | null;
  payment_status: PaymentStatus;
  paid_at: Date | null;
  created_at: Date;
  session: SessionRow;
}

export function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    status: row.status,
    cancelledAt: toIsoStringOrNull(row.cancelled_at),
    cancelledBy: row.cancelled_by,
    paymentStatus: row.payment_status,
    paidAt: toIsoStringOrNull(row.paid_at),
    createdAt: toIsoString(row.created_at),
  };
}

export function toBookingWithSession(row: BookingRow): BookingWithSession {
  return { ...toBooking(row), session: toSessionSummary(row.session) };
}

export function toBookingOwner(row: BookingRow): EmailRecipient {
  return { name: row.name, email: row.email, timeZone: row.time_zone };
}
