import { apiRequest } from '@/api/client';
import type { LoginRequest, User, UserResponse } from '@/types/auth';

export async function login(input: LoginRequest): Promise<User> {
  const { user } = await apiRequest<UserResponse>('/auth/login', { method: 'POST', body: input });
  return user;
}
