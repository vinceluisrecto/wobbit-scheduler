import type { Booking, PaymentStatus } from '../bookings';
import type { SessionSummary } from '../sessions';
import type { WaitlistEntry } from '../waitlist';

export interface AdminSessionSummary extends SessionSummary {
  bookedCount: number;
  paidCount: number;
  waitlistCount: number;
  refundDueCount: number;
}

export interface SessionInput {
  // create: all required; update: at least one field
  title: string;
  instructor: string;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  priceCents: number;
}

export interface ListAdminSessionsResponse {
  sessions: AdminSessionSummary[];
}

export interface AdminSessionResponse {
  session: AdminSessionSummary;
}

export interface AdminSessionDetailResponse {
  session: AdminSessionSummary;
  bookings: Booking[]; // confirmed first, then cancelled; each by booking time
  waitlist: WaitlistEntry[]; // waiting only, by position
}

export interface UpdatePaymentRequest {
  paymentStatus: PaymentStatus;
}

// Backend-only: `GET /api/admin/sessions?scope=`
export type AdminSessionScope = 'upcoming' | 'past';
