import { apiRequest } from '@/api/client';
import type { AdminSessionDetailResponse } from '@/types/admin';

/** The class with its roster (confirmed, then cancelled) and its waiting list in order. */
export async function getAdminSession(sessionId: string): Promise<AdminSessionDetailResponse> {
  return apiRequest<AdminSessionDetailResponse>(`/admin/sessions/${encodeURIComponent(sessionId)}`);
}
