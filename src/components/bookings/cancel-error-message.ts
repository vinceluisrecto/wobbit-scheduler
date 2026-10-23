import { isApiError } from '@/api/client';

/** The inline message for a failed cancel, used wherever a member cancels a booking. */
export function cancelErrorMessage(error: unknown): string {
  if (isApiError(error, 'BOOKING_ALREADY_CANCELLED')) return 'This booking was already cancelled';
  if (isApiError(error, 'SESSION_PAST')) return 'This class has already started, so it can’t be cancelled';
  if (isApiError(error, 'BOOKING_NOT_FOUND')) return 'We can’t find this booking any more';
  return 'Something went wrong, nothing was changed';
}
