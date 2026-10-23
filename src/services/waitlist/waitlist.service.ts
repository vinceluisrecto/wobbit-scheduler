import {
  findWaitlistEntryById,
  joinWaitlist as joinWaitlistInDb,
  removeWaitlistEntry,
  type JoinWaitlistRefusal,
} from '../../repositories/waitlist';
import type { AuthUser } from '../../types/auth';
import type { WaitlistEntryWithSession } from '../../types/waitlist';
import {
  AlreadyBookedError,
  AlreadyWaitlistedError,
  SessionNotFoundError,
  SessionNotFullError,
  SessionPastError,
  WaitlistEntryNotFoundError,
  type AppError,
} from '../../utils/errors';
import { sendEmailInBackground, waitlistJoinedEmail } from '../email';
import { isOwnerOrAdmin } from '../shared';

const joinRefusals: Record<JoinWaitlistRefusal, () => AppError> = {
  SESSION_NOT_FOUND: () => new SessionNotFoundError(),
  SESSION_PAST: () => new SessionPastError(),
  SESSION_NOT_FULL: () => new SessionNotFullError(),
  ALREADY_BOOKED: () => new AlreadyBookedError(),
  ALREADY_WAITLISTED: () => new AlreadyWaitlistedError(),
};

export async function joinWaitlist(sessionId: string, user: AuthUser): Promise<WaitlistEntryWithSession> {
  const result = await joinWaitlistInDb(sessionId, user.id);
  if (!result.ok) throw joinRefusals[result.reason]();

  const { entry, owner } = result.value;
  sendEmailInBackground(() => waitlistJoinedEmail(owner, entry.position ?? 1, entry.session));
  return entry;
}

// Leave (owner) or remove (admin). Missing, no longer waiting, or not yours → not found.
export async function leaveWaitlist(id: string, user: AuthUser): Promise<void> {
  const record = await findWaitlistEntryById(id);
  if (!record || record.entry.status !== 'waiting' || !isOwnerOrAdmin(record.entry.userId, user)) {
    throw new WaitlistEntryNotFoundError();
  }

  const removed = await removeWaitlistEntry(id);
  if (!removed) throw new WaitlistEntryNotFoundError();
}
