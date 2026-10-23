import { apiRequest } from '@/api/client';
import type { ForgotPasswordRequest } from '@/types/auth';

export async function forgotPassword(input: ForgotPasswordRequest): Promise<void> {
  await apiRequest<void>('/auth/forgot-password', { method: 'POST', body: input });
}
