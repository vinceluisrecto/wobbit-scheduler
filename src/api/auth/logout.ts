import { apiRequest } from '@/api/client';

export async function logout(): Promise<void> {
  await apiRequest<void>('/auth/logout', { method: 'POST' });
}
