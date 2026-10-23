import type { AdminSessionDetailResponse, AdminSessionSummary } from '@/types/admin';
import type { Booking } from '@/types/bookings';
import type { WaitlistEntry } from '@/types/waitlist';

// Tests fake only Date and pin "now" here (local time), so "Today" grouping is deterministic.
export const NOW = new Date(2026, 9, 23, 9, 0);

export function atLocal(dayOffset: number, hour: number, minute = 0): string {
  return new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + dayOffset, hour, minute).toISOString();
}

export function makeSession(overrides: Partial<AdminSessionSummary> = {}): AdminSessionSummary {
  return {
    id: '20000000-0000-4000-8000-000000000001',
    title: 'Morning Flow',
    instructor: 'Ana Reyes',
    startsAt: atLocal(0, 18),
    durationMinutes: 60,
    capacity: 10,
    priceCents: 1500,
    spotsLeft: 4,
    isFull: false,
    bookedCount: 6,
    paidCount: 4,
    waitlistCount: 0,
    refundDueCount: 0,
    ...overrides,
  };
}

export function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: '30000000-0000-4000-8000-000000000001',
    sessionId: '20000000-0000-4000-8000-000000000001',
    userId: '10000000-0000-4000-8000-000000000001',
    name: 'Maya Santos',
    email: 'maya@example.com',
    status: 'confirmed',
    cancelledAt: null,
    cancelledBy: null,
    paymentStatus: 'unpaid',
    paidAt: null,
    createdAt: atLocal(-2, 10),
    ...overrides,
  };
}

export function makeWaitlistEntry(overrides: Partial<WaitlistEntry> = {}): WaitlistEntry {
  return {
    id: '40000000-0000-4000-8000-000000000001',
    sessionId: '20000000-0000-4000-8000-000000000001',
    userId: '10000000-0000-4000-8000-000000000011',
    name: 'Lily Navarro',
    email: 'lily@example.com',
    status: 'waiting',
    position: 1,
    bookingId: null,
    createdAt: atLocal(-1, 12),
    ...overrides,
  };
}

export function makeDetail(overrides: Partial<AdminSessionDetailResponse> = {}): AdminSessionDetailResponse {
  return { session: makeSession(), bookings: [makeBooking()], waitlist: [], ...overrides };
}
