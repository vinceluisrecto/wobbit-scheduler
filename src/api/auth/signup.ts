import { apiRequest } from '@/api/client';
import type { SignupRequest, User, UserResponse } from '@/types/auth';

/** Creates a member account and logs it in. Sends the device timezone so emails match the screen. */
export async function signup(input: Omit<SignupRequest, 'timeZone'>): Promise<User> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { user } = await apiRequest<UserResponse>('/auth/signup', { method: 'POST', body: { ...input, timeZone } });
  return user;
}
