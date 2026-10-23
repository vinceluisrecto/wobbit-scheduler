import { listAdminRecipients } from '../../repositories/auth';
import {
  cancelBooking as cancelBookingInDb,
  createBooking as createBookingInDb,
  findBookingById,
  type CancelBookingRefusal,
  type CreateBookingRefusal,
} from '../../repositories/bookings';
import type { PromotedBooking } from '../../repositories/waitlist';
import type { AuthUser } from '../../types/auth';
import type { BookingWithSession } from '../../types/bookings';
import type { SessionSummary } from '../../types/sessions';
import {
  AlreadyBookedError,
  BookingAlreadyCancelledError,
  BookingNotFoundError,
  SessionFullError,
  SessionNotFoundError,
  SessionPastError,
  type AppError,
} from '../../utils/errors';
import {
  bookingCancelledEmail,
  bookingConfirmedEmail,
  promotedEmail,
  refundDueEmail,
  sendEmailInBackground,
} from '../email';
import { isOwnerOrAdmin } from '../shared';

const createRefusals: Record<CreateBookingRefusal, () => AppError> = {
  SESSION_NOT_FOUND: () => new SessionNotFoundError(),
  SESSION_PAST: () => new SessionPastError(),
  SESSION_FULL: () => new SessionFullError(),
  ALREADY_BOOKED: () => new AlreadyBookedError(),
};

const cancelRefusals: Record<CancelBookingRefusal, () => AppError> = {
  BOOKING_NOT_FOUND: () => new BookingNotFoundError(),
  SESSION_PAST: () => new SessionPastError(),
  BOOKING_ALREADY_CANCELLED: () => new BookingAlreadyCancelledError(),
};

// E4 to each member a freed place went to. Also used by the admin capacity edit.
export function notifyPromoted(promoted: PromotedBooking[], session: SessionSummary): void {
  for (const { booking, owner } of promoted) {
    sendEmailInBackground(() => promotedEmail(owner, booking.id, session));
  }
}

export async function createBooking(sessionId: string, user: AuthUser): Promise<BookingWithSession> {
  const result = await createBookingInDb(sessionId, user.id);
  if (!result.ok) throw createRefusals[result.reason]();

  const { booking, owner } = result.value;
  sendEmailInBackground(() => bookingConfirmedEmail(owner, booking.id, booking.session));
  return booking;
}

// Someone else's booking is reported as not found, so its existence is never revealed.
export async function getBooking(id: string, user: AuthUser): Promise<BookingWithSession> {
  const record = await findBookingById(id);
  if (!record || !isOwnerOrAdmin(record.booking.userId, user)) throw new BookingNotFoundError();
  return record.booking;
}

export async function cancelBooking(id: string, user: AuthUser): Promise<BookingWithSession> {
  const record = await findBookingById(id);
  if (!record || !isOwnerOrAdmin(record.booking.userId, user)) throw new BookingNotFoundError();

  const cancelledBy = record.booking.userId === user.id ? 'member' : 'admin';
  const result = await cancelBookingInDb(id, cancelledBy);
  if (!result.ok) throw cancelRefusals[result.reason]();

  const { booking, owner, promoted } = result.value;
  sendEmailInBackground(() => bookingCancelledEmail(owner, booking.session, cancelledBy));
  notifyPromoted(promoted, booking.session);
  if (booking.paymentStatus === 'paid') notifyAdminsOfRefund(booking);
  return booking;
}

// E8 to every admin. Not awaited: the cancellation has already committed.
function notifyAdminsOfRefund(booking: BookingWithSession): void {
  listAdminRecipients()
    .then((admins) => {
      for (const admin of admins) {
        sendEmailInBackground(() => refundDueEmail(admin, booking, booking.session));
      }
    })
    .catch((error: unknown) => console.error('Looking up admins for the refund email failed:', error));
}
