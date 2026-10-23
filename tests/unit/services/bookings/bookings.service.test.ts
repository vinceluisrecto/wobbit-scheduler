import { listAdminRecipients } from '../../../../src/repositories/auth';
import { cancelBooking as cancelBookingInDb, createBooking as createBookingInDb, findBookingById } from '../../../../src/repositories/bookings';
import { cancelBooking, createBooking, getBooking } from '../../../../src/services/bookings';
import { sendEmailInBackground } from '../../../../src/services/email/send-email';
import {
  AlreadyBookedError,
  BookingAlreadyCancelledError,
  BookingNotFoundError,
  SessionFullError,
  SessionNotFoundError,
  SessionPastError,
} from '../../../../src/utils/errors';
import { admin, builtEmails, makeBooking, member, otherMember, owner } from '../fixtures';

jest.mock('../../../../src/repositories/auth');
jest.mock('../../../../src/repositories/bookings');
jest.mock('../../../../src/services/email/send-email');

const mocked = {
  createBookingInDb: jest.mocked(createBookingInDb),
  cancelBookingInDb: jest.mocked(cancelBookingInDb),
  findBookingById: jest.mocked(findBookingById),
  listAdminRecipients: jest.mocked(listAdminRecipients),
  sendEmailInBackground: jest.mocked(sendEmailInBackground) as jest.Mock,
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('bookings service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('createBooking', () => {
    it('returns the booking and sends E2 to the owner', async () => {
      const booking = makeBooking();
      mocked.createBookingInDb.mockResolvedValue({ ok: true, value: { booking, owner } });

      await expect(createBooking('session-1', member)).resolves.toBe(booking);
      expect(mocked.createBookingInDb).toHaveBeenCalledWith('session-1', member.id);
      const [email] = builtEmails(mocked.sendEmailInBackground);
      expect(email.to).toBe(owner.email);
      expect(email.text).toContain('/bookings/booking-1');
    });

    it.each([
      ['SESSION_NOT_FOUND', SessionNotFoundError],
      ['SESSION_PAST', SessionPastError],
      ['SESSION_FULL', SessionFullError],
      ['ALREADY_BOOKED', AlreadyBookedError],
    ] as const)('maps %s to its typed error and sends nothing', async (reason, ErrorClass) => {
      mocked.createBookingInDb.mockResolvedValue({ ok: false, reason });
      await expect(createBooking('session-1', member)).rejects.toBeInstanceOf(ErrorClass);
      expect(mocked.sendEmailInBackground).not.toHaveBeenCalled();
    });
  });

  describe('getBooking (owner or admin)', () => {
    it('returns it to the owner and to an admin', async () => {
      const booking = makeBooking();
      mocked.findBookingById.mockResolvedValue({ booking, owner });
      await expect(getBooking(booking.id, member)).resolves.toBe(booking);
      await expect(getBooking(booking.id, admin)).resolves.toBe(booking);
    });

    it('hides it from another member and when missing', async () => {
      mocked.findBookingById.mockResolvedValueOnce({ booking: makeBooking(), owner });
      await expect(getBooking('booking-1', otherMember)).rejects.toBeInstanceOf(BookingNotFoundError);
      mocked.findBookingById.mockResolvedValueOnce(null);
      await expect(getBooking('booking-1', member)).rejects.toBeInstanceOf(BookingNotFoundError);
    });
  });

  describe('cancelBooking', () => {
    const cancelled = makeBooking({ status: 'cancelled', cancelledAt: '2029-12-02T00:00:00.000Z' });

    it('records "member" when the owner cancels and sends E5', async () => {
      mocked.findBookingById.mockResolvedValue({ booking: makeBooking(), owner });
      mocked.cancelBookingInDb.mockResolvedValue({ ok: true, value: { booking: { ...cancelled, cancelledBy: 'member' }, owner, promoted: [] } });

      await cancelBooking('booking-1', member);

      expect(mocked.cancelBookingInDb).toHaveBeenCalledWith('booking-1', 'member');
      const [email] = builtEmails(mocked.sendEmailInBackground);
      expect(email.text).toContain('You cancelled');
    });

    it('records "admin" when an admin cancels someone else\'s booking', async () => {
      mocked.findBookingById.mockResolvedValue({ booking: makeBooking(), owner });
      mocked.cancelBookingInDb.mockResolvedValue({ ok: true, value: { booking: { ...cancelled, cancelledBy: 'admin' }, owner, promoted: [] } });

      await cancelBooking('booking-1', admin);

      expect(mocked.cancelBookingInDb).toHaveBeenCalledWith('booking-1', 'admin');
      expect(builtEmails(mocked.sendEmailInBackground)[0].text).toContain('The studio cancelled');
    });

    it('refuses another member with BOOKING_NOT_FOUND and never touches the database', async () => {
      mocked.findBookingById.mockResolvedValue({ booking: makeBooking(), owner });
      await expect(cancelBooking('booking-1', otherMember)).rejects.toBeInstanceOf(BookingNotFoundError);
      expect(mocked.cancelBookingInDb).not.toHaveBeenCalled();
    });

    it.each([
      ['BOOKING_NOT_FOUND', BookingNotFoundError],
      ['SESSION_PAST', SessionPastError],
      ['BOOKING_ALREADY_CANCELLED', BookingAlreadyCancelledError],
    ] as const)('maps %s to its typed error', async (reason, ErrorClass) => {
      mocked.findBookingById.mockResolvedValue({ booking: makeBooking(), owner });
      mocked.cancelBookingInDb.mockResolvedValue({ ok: false, reason });
      await expect(cancelBooking('booking-1', member)).rejects.toBeInstanceOf(ErrorClass);
      expect(mocked.sendEmailInBackground).not.toHaveBeenCalled();
    });

    it('sends E4 to each promoted member', async () => {
      const promotedOwner = { name: 'Leo', email: 'leo@example.com', timeZone: 'UTC' };
      mocked.findBookingById.mockResolvedValue({ booking: makeBooking(), owner });
      mocked.cancelBookingInDb.mockResolvedValue({
        ok: true,
        value: { booking: cancelled, owner, promoted: [{ booking: makeBooking({ id: 'booking-2' }), owner: promotedOwner }] },
      });

      await cancelBooking('booking-1', member);

      const promotedEmails = builtEmails(mocked.sendEmailInBackground).filter((e) => e.subject.startsWith('You got a place'));
      expect(promotedEmails).toHaveLength(1);
      expect(promotedEmails[0].to).toBe('leo@example.com');
      expect(promotedEmails[0].text).toContain('/bookings/booking-2');
    });

    it('sends E8 to every admin only when the cancelled booking was paid', async () => {
      mocked.findBookingById.mockResolvedValue({ booking: makeBooking(), owner });
      mocked.listAdminRecipients.mockResolvedValue([
        { name: 'A', email: 'a@studio.local', timeZone: 'UTC' },
        { name: 'B', email: 'b@studio.local', timeZone: 'UTC' },
      ]);

      mocked.cancelBookingInDb.mockResolvedValueOnce({ ok: true, value: { booking: cancelled, owner, promoted: [] } });
      await cancelBooking('booking-1', member);
      await flush();
      expect(mocked.listAdminRecipients).not.toHaveBeenCalled();

      mocked.cancelBookingInDb.mockResolvedValueOnce({
        ok: true,
        value: { booking: { ...cancelled, paymentStatus: 'paid', paidAt: '2029-12-01T00:00:00.000Z' }, owner, promoted: [] },
      });
      await cancelBooking('booking-1', member);
      await flush();
      const refunds = builtEmails(mocked.sendEmailInBackground).filter((e) => e.subject.startsWith('Refund due'));
      expect(refunds.map((e) => e.to)).toEqual(['a@studio.local', 'b@studio.local']);
    });

    it('still returns the cancelled booking when looking up admins fails', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      mocked.findBookingById.mockResolvedValue({ booking: makeBooking(), owner });
      mocked.listAdminRecipients.mockRejectedValue(new Error('db down'));
      const paid = { ...cancelled, paymentStatus: 'paid' as const, paidAt: '2029-12-01T00:00:00.000Z' };
      mocked.cancelBookingInDb.mockResolvedValue({ ok: true, value: { booking: paid, owner, promoted: [] } });

      await expect(cancelBooking('booking-1', member)).resolves.toBe(paid);
      await flush();
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});
