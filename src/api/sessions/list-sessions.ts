import { apiRequest } from '@/api/client';
import type { ListSessionsResponse, SessionSummary } from '@/types/sessions';

/** Upcoming classes, soonest first. */
export async function listSessions(): Promise<SessionSummary[]> {
  const { sessions } = await apiRequest<ListSessionsResponse>('/sessions');
  return sessions;
}
