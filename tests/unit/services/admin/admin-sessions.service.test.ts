import {
  createSession as createSessionInDb,
  deleteSession as deleteSessionInDb,
  getSessionDetail,
  listAdminSessions,
  updateSession as updateSessionInDb,
  type UpdatedSession,
} from '../../../../src/repositories/admin';
import { createSession, deleteSession, getSessionForAdmin, listSessionsForAdmin, updateSession } from '../../../../src/services/admin';
import { sendEmailInBackground } from '../../../../src/services/email/send-email';
import type { AdminSessionSummary } from '../../../../src/types/admin';
import {
  CapacityBelowBookingsError,
  SessionHasBookingsError,
  SessionNotFoundError,
  SessionPastError,
} from '../../../../src/utils/errors';
import { builtEmails, makeBooking, owner, session } from '../fixtures';

jest.mock('../../../../src/repositories/admin');
jest.mock('../../../../src/services/email/send-email');

const mocked = {
  listAdminSessions: jest.mocked(listAdminSessions),
  createSessionInDb: jest.mocked(createSessionInDb),
  getSessionDetail: jest.mocked(getSessionDetail),
  updateSessionInDb: jest.mocked(updateSessionInDb),
  deleteSessionInDb: jest.mocked(deleteSessionInDb),
  sendEmailInBackground: jest.mocked(sendEmailInBackground) as jest.Mock,
};

const adminSession: AdminSessionSummary = { ...session, bookedCount: 5, paidCount: 2, waitlistCount: 1, refundDueCount: 0 };
const leo = { name: 'Leo', email: 'leo@example.com', timeZone: 'UTC' };

function updated(after: Partial<AdminSessionSummary>, extra: Partial<UpdatedSession> = {}): UpdatedSession {
  return {
    previous: session,
    session: { ...adminSession, ...after },
    confirmed: [
      { booking: makeBooking({ id: 'booking-1' }), owner },
      { booking: makeBooking({ id: 'booking-2' }), owner: leo },
    ],
    promoted: [],
    ...extra,
  };
}

describe('admin sessions service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('lists by scope and creates through the repository', async () => {
    mocked.listAdminSessions.mockResolvedValue([adminSession]);
    mocked.createSessionInDb.mockResolvedValue(adminSession);

    await expect(listSessionsForAdmin('past')).resolves.toEqual([adminSession]);
    expect(mocked.listAdminSessions).toHaveBeenCalledWith('past');
    const input = { title: 'Yoga', instructor: 'Ana', startsAt: session.startsAt, durationMinutes: 60, capacity: 10, priceCents: 0 };
    await expect(createSession(input)).resolves.toBe(adminSession);
  });

  it('throws SESSION_NOT_FOUND for a missing class detail', async () => {
    mocked.getSessionDetail.mockResolvedValue(null);
    await expect(getSessionForAdmin('missing')).rejects.toBeInstanceOf(SessionNotFoundError);
  });

  describe('updateSession', () => {
    it.each([
      ['SESSION_NOT_FOUND', SessionNotFoundError],
      ['SESSION_PAST', SessionPastError],
      ['CAPACITY_BELOW_BOOKINGS', CapacityBelowBookingsError],
    ] as const)('maps %s to its typed error and sends nothing', async (reason, ErrorClass) => {
      mocked.updateSessionInDb.mockResolvedValue({ ok: false, reason });
      await expect(updateSession('session-1', { capacity: 1 })).rejects.toBeInstanceOf(ErrorClass);
      expect(mocked.sendEmailInBackground).not.toHaveBeenCalled();
    });

    it.each([
      ['title', { title: 'Hot Yoga' }],
      ['instructor', { instructor: 'Marco' }],
      ['startsAt', { startsAt: '2030-01-02T10:00:00.000Z' }],
      ['durationMinutes', { durationMinutes: 90 }],
    ])('sends E6 to every confirmed member when %s changes', async (_field, after) => {
      mocked.updateSessionInDb.mockResolvedValue({ ok: true, value: updated(after) });

      await updateSession('session-1', after);

      const emails = builtEmails(mocked.sendEmailInBackground);
      expect(emails.map((email) => email.to)).toEqual([owner.email, leo.email]);
      expect(emails[0].subject).toMatch(/^Class details changed/);
      expect(emails[1].text).toContain('/bookings/booking-2');
    });

    it.each([
      ['capacity', { capacity: 20 }],
      ['priceCents', { priceCents: 9900 }],
    ])('sends no E6 when only %s changes', async (_field, after) => {
      mocked.updateSessionInDb.mockResolvedValue({ ok: true, value: updated(after) });
      await updateSession('session-1', after);
      expect(mocked.sendEmailInBackground).not.toHaveBeenCalled();
    });

    it('sends no E6 when a field is sent with its current value', async () => {
      mocked.updateSessionInDb.mockResolvedValue({ ok: true, value: updated({}) });
      await updateSession('session-1', { title: session.title });
      expect(mocked.sendEmailInBackground).not.toHaveBeenCalled();
    });

    it('sends E4 to each member promoted by a capacity increase', async () => {
      const promoted = [{ booking: makeBooking({ id: 'booking-9' }), owner: leo }];
      mocked.updateSessionInDb.mockResolvedValue({ ok: true, value: updated({ capacity: 11 }, { promoted }) });

      await updateSession('session-1', { capacity: 11 });

      const emails = builtEmails(mocked.sendEmailInBackground);
      expect(emails).toHaveLength(1);
      expect(emails[0]).toMatchObject({ to: leo.email, subject: expect.stringMatching(/^You got a place/) });
      expect(emails[0].text).toContain('/bookings/booking-9');
    });
  });

  describe('deleteSession', () => {
    it('resolves when the repository deleted it', async () => {
      mocked.deleteSessionInDb.mockResolvedValue({ ok: true, value: null });
      await expect(deleteSession('session-1')).resolves.toBeUndefined();
    });

    it.each([
      ['SESSION_NOT_FOUND', SessionNotFoundError],
      ['SESSION_HAS_BOOKINGS', SessionHasBookingsError],
    ] as const)('maps %s to its typed error', async (reason, ErrorClass) => {
      mocked.deleteSessionInDb.mockResolvedValue({ ok: false, reason });
      await expect(deleteSession('session-1')).rejects.toBeInstanceOf(ErrorClass);
    });
  });
});
