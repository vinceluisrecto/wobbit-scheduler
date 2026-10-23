import { apiRequest } from '@/api/client';
import type { GetSessionResponse, SessionSummary } from '@/types/sessions';

export async function getSession(sessionId: string): Promise<SessionSummary> {
  const { session } = await apiRequest<GetSessionResponse>(`/sessions/${encodeURIComponent(sessionId)}`);
  return session;
}
