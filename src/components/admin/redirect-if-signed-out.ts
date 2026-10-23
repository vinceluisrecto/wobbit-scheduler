import type { useRouter } from 'next/navigation';
import { isApiError } from '@/api/client';

type Router = ReturnType<typeof useRouter>;

export const ADMIN_LOGIN_PATH = '/admin/login';

/** Why the login page was opened, shown as a message there. */
export type AdminLoginReason = 'forbidden' | 'expired';

/**
 * Sends the owner back to the admin login when an admin call answers 401 (logged out or expired)
 * or 403 (not an admin). Returns true when it redirected. The API is the real security; this is UX.
 */
export function redirectIfSignedOut(error: unknown, router: Router): boolean {
  if (isApiError(error, 'UNAUTHORIZED')) {
    router.replace(`${ADMIN_LOGIN_PATH}?reason=expired`);
    return true;
  }
  if (isApiError(error, 'FORBIDDEN')) {
    router.replace(`${ADMIN_LOGIN_PATH}?reason=forbidden`);
    return true;
  }
  return false;
}
