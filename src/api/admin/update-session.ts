import { apiRequest } from '@/api/client';
import type { AdminSessionResponse, AdminSessionSummary, SessionInput } from '@/types/admin';

/** Sends only the changed fields. Raising capacity books from the waitlist on the server. */
export async function updateSession(sessionId: string, changes: Partial<SessionInput>): Promise<AdminSessionSummary> {
  const { session } = await apiRequest<AdminSessionResponse>(`/admin/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'PATCH',
    body: changes,
  });
  return session;
}
