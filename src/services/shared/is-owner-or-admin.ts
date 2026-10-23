import type { AuthUser } from '../../types/auth';

// Members may only touch their own bookings and waitlist entries; admins may touch any.
export function isOwnerOrAdmin(ownerId: string, user: AuthUser): boolean {
  return ownerId === user.id || user.role === 'admin';
}
