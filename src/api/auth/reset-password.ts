import { apiRequest } from '@/api/client';
import type { ResetPasswordRequest } from '@/types/auth';

export async function resetPassword(input: ResetPasswordRequest): Promise<void> {
  await apiRequest<void>('/auth/reset-password', { method: 'POST', body: input });
}
