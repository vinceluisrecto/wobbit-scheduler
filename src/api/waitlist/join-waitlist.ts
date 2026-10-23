import { apiRequest } from '@/api/client';
import type { WaitlistEntryResponse, WaitlistEntryWithSession } from '@/types/waitlist';

export async function joinWaitlist(sessionId: string): Promise<WaitlistEntryWithSession> {
  const { waitlistEntry } = await apiRequest<WaitlistEntryResponse>(
    `/sessions/${encodeURIComponent(sessionId)}/waitlist`,
    { method: 'POST' },
  );
  return waitlistEntry;
}
