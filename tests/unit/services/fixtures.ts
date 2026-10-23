import type { AuthUser } from '../../../src/types/auth';
import type { BookingWithSession } from '../../../src/types/bookings';
import type { EmailRecipient } from '../../../src/types/email';
import type { SessionSummary } from '../../../src/types/sessions';
import type { WaitlistEntryWithSession } from '../../../src/types/waitlist';

// Shared builders for the mocked-repository unit tests.

export const member: AuthUser = { id: 'member-1', name: 'Maya', email: 'maya@example.com', role: 'member', timeZone: 'UTC' };
export const otherMember: AuthUser = { id: 'member-2', name: 'Leo', email: 'leo@example.com', role: 'member', timeZone: 'UTC' };
export const admin: AuthUser = { id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'admin', timeZone: 'UTC' };

export const owner: EmailRecipient = { name: 'Maya', email: 'maya@example.com', timeZone: 'UTC' };

export const session: SessionSummary = {
  id: 'session-1',
  title: 'Yoga',
  instructor: 'Ana',
  startsAt: '2030-01-01T10:00:00.000Z',
  durationMinutes: 60,
  capacity: 10,
  priceCents: 1500,
  spotsLeft: 5,
  isFull: false,
};

export function makeBooking(overrides: Partial<BookingWithSession> = {}): BookingWithSession {
  return {
    id: 'booking-1',
    sessionId: session.id,
    userId: member.id,
    name: member.name,
    email: member.email,
    status: 'confirmed',
    cancelledAt: null,
    cancelledBy: null,
    paymentStatus: 'unpaid',
    paidAt: null,
    createdAt: '2029-12-01T10:00:00.000Z',
    session,
    ...overrides,
  };
}

export function makeWaitlistEntry(overrides: Partial<WaitlistEntryWithSession> = {}): WaitlistEntryWithSession {
  return {
    id: 'entry-1',
    sessionId: session.id,
    userId: member.id,
    name: member.name,
    email: member.email,
    status: 'waiting',
    position: 1,
    bookingId: null,
    createdAt: '2029-12-01T10:00:00.000Z',
    session,
    ...overrides,
  };
}

// sendEmailInBackground takes a builder; run them to see which emails were built.
export function builtEmails(mock: jest.Mock): { to: string; subject: string; text: string }[] {
  return mock.mock.calls.map(([build]) => build());
}
