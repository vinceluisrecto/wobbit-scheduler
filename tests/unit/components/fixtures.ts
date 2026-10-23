import type { BookingWithSession } from '@/types/bookings';
import type { SessionSummary } from '@/types/sessions';
import type { WaitlistEntryWithSession } from '@/types/waitlist';

const HOUR = 60 * 60 * 1000;

export function inHours(hours: number): string {
  return new Date(Date.now() + hours * HOUR).toISOString();
}

export function makeSession(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: 'session-1',
    title: 'Sunset Vinyasa',
    instructor: 'Ana Rivera',
    startsAt: inHours(48),
    durationMinutes: 75,
    capacity: 12,
    priceCents: 2000,
    spotsLeft: 8,
    isFull: false,
    ...overrides,
  };
}

export function makeBooking(overrides: Partial<BookingWithSession> = {}): BookingWithSession {
  return {
    id: 'booking-1',
    sessionId: 'session-1',
    userId: 'user-1',
    name: 'Maya Santos',
    email: 'maya@example.com',
    status: 'confirmed',
    cancelledAt: null,
    cancelledBy: null,
    paymentStatus: 'unpaid',
    paidAt: null,
    createdAt: new Date().toISOString(),
    session: makeSession(),
    ...overrides,
  };
}

export function makeWaitlistEntry(overrides: Partial<WaitlistEntryWithSession> = {}): WaitlistEntryWithSession {
  return {
    id: 'entry-1',
    sessionId: 'session-2',
    userId: 'user-1',
    name: 'Maya Santos',
    email: 'maya@example.com',
    status: 'waiting',
    position: 2,
    bookingId: null,
    createdAt: new Date().toISOString(),
    session: makeSession({ id: 'session-2', title: 'Power Pilates', isFull: true, spotsLeft: 0 }),
    ...overrides,
  };
}

/** A promise you resolve or reject later, to assert on loading states. */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
