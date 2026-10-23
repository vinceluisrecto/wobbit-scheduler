import { apiRequest, isApiError } from '@/api/client';
import type { User, UserResponse } from '@/types/auth';

/** The logged-in user, or null when logged out (401). Other errors still throw. */
export async function getMe(): Promise<User | null> {
  try {
    const { user } = await apiRequest<UserResponse>('/auth/me');
    return user;
  } catch (error) {
    if (isApiError(error, 'UNAUTHORIZED')) return null;
    throw error;
  }
}
