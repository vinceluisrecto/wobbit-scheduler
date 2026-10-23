import { apiRequest } from '@/api/client';

/** Removes a waiting entry. The same endpoint serves the owner and admins. */
export async function leaveWaitlist(waitlistEntryId: string): Promise<void> {
  await apiRequest<void>(`/waitlist/${encodeURIComponent(waitlistEntryId)}`, { method: 'DELETE' });
}
