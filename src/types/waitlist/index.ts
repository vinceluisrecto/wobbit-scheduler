import type { SessionSummary } from '../sessions';

export type WaitlistStatus = 'waiting' | 'promoted' | 'removed';

export interface WaitlistEntry {
  id: string;
  sessionId: string;
  userId: string;
  name: string;
  email: string;
  status: WaitlistStatus;
  position: number | null; // 1-based while waiting, otherwise null
  bookingId: string | null; // set once promoted
  createdAt: string;
}

export interface WaitlistEntryWithSession extends WaitlistEntry {
  session: SessionSummary;
}

export interface WaitlistEntryResponse {
  waitlistEntry: WaitlistEntryWithSession;
}
