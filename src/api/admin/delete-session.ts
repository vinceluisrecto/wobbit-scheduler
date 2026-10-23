import { apiRequest } from '@/api/client';

/** Only a class that never had a booking or waitlist entry can be deleted (SESSION_HAS_BOOKINGS otherwise). */
export async function deleteSession(sessionId: string): Promise<void> {
  await apiRequest<void>(`/admin/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
}
