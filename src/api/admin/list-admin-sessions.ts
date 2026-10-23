import { apiRequest } from '@/api/client';
import type { AdminSessionScope, AdminSessionSummary, ListAdminSessionsResponse } from '@/types/admin';

/** upcoming: soonest first. past: most recent first. */
export async function listAdminSessions(scope: AdminSessionScope = 'upcoming'): Promise<AdminSessionSummary[]> {
  const { sessions } = await apiRequest<ListAdminSessionsResponse>(`/admin/sessions?scope=${scope}`);
  return sessions;
}
