import { findSessionById, listUpcomingSessions } from '../../repositories/sessions';
import type { SessionSummary } from '../../types/sessions';
import { SessionNotFoundError } from '../../utils/errors';

export function listSessions(): Promise<SessionSummary[]> {
  return listUpcomingSessions();
}

export async function getSession(id: string): Promise<SessionSummary> {
  const session = await findSessionById(id);
  if (!session) throw new SessionNotFoundError();
  return session;
}
