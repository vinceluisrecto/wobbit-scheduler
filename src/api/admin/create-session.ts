import { apiRequest } from '@/api/client';
import type { AdminSessionResponse, AdminSessionSummary, SessionInput } from '@/types/admin';

export async function createSession(input: SessionInput): Promise<AdminSessionSummary> {
  const { session } = await apiRequest<AdminSessionResponse>('/admin/sessions', { method: 'POST', body: input });
  return session;
}
