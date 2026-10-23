import {
  createSession as createSessionInDb,
  deleteSession as deleteSessionInDb,
  getSessionDetail,
  listAdminSessions,
  updateSession as updateSessionInDb,
  type UpdateSessionRefusal,
} from '../../repositories/admin';
import type {
  AdminSessionDetailResponse,
  AdminSessionScope,
  AdminSessionSummary,
  SessionInput,
} from '../../types/admin';
import type { SessionSummary } from '../../types/sessions';
import {
  CapacityBelowBookingsError,
  SessionHasBookingsError,
  SessionNotFoundError,
  SessionPastError,
  type AppError,
} from '../../utils/errors';
import { notifyPromoted } from '../bookings';
import { classChangedEmail, sendEmailInBackground } from '../email';

const updateRefusals: Record<UpdateSessionRefusal, () => AppError> = {
  SESSION_NOT_FOUND: () => new SessionNotFoundError(),
  SESSION_PAST: () => new SessionPastError(),
  CAPACITY_BELOW_BOOKINGS: () => new CapacityBelowBookingsError(),
};

// Only these changes matter to someone who is booked in (E6). Capacity and price don't.
const MEMBER_FACING_FIELDS = ['title', 'instructor', 'startsAt', 'durationMinutes'] as const;

export function hasMemberFacingChange(before: SessionSummary, after: SessionSummary): boolean {
  return MEMBER_FACING_FIELDS.some((field) => before[field] !== after[field]);
}

export function listSessionsForAdmin(scope: AdminSessionScope): Promise<AdminSessionSummary[]> {
  return listAdminSessions(scope);
}

export function createSession(input: SessionInput): Promise<AdminSessionSummary> {
  return createSessionInDb(input);
}

export async function getSessionForAdmin(id: string): Promise<AdminSessionDetailResponse> {
  const detail = await getSessionDetail(id);
  if (!detail) throw new SessionNotFoundError();
  return detail;
}

export async function updateSession(id: string, changes: Partial<SessionInput>): Promise<AdminSessionSummary> {
  const result = await updateSessionInDb(id, changes);
  if (!result.ok) throw updateRefusals[result.reason]();

  const { previous, session, confirmed, promoted } = result.value;
  if (hasMemberFacingChange(previous, session)) {
    for (const { booking, owner } of confirmed) {
      sendEmailInBackground(() => classChangedEmail(owner, booking.id, session));
    }
  }
  notifyPromoted(promoted, session);
  return session;
}

export async function deleteSession(id: string): Promise<void> {
  const result = await deleteSessionInDb(id);
  if (result.ok) return;
  throw result.reason === 'SESSION_NOT_FOUND' ? new SessionNotFoundError() : new SessionHasBookingsError();
}
