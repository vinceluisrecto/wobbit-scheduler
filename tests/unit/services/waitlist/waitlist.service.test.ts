import { sendEmailInBackground } from '../../../../src/services/email/send-email';
import { findWaitlistEntryById, joinWaitlist as joinWaitlistInDb, removeWaitlistEntry } from '../../../../src/repositories/waitlist';
import { joinWaitlist, leaveWaitlist } from '../../../../src/services/waitlist';
import {
  AlreadyBookedError,
  AlreadyWaitlistedError,
  SessionNotFoundError,
  SessionNotFullError,
  SessionPastError,
  WaitlistEntryNotFoundError,
} from '../../../../src/utils/errors';
import { admin, builtEmails, makeWaitlistEntry, member, otherMember, owner } from '../fixtures';

jest.mock('../../../../src/repositories/waitlist');
jest.mock('../../../../src/services/email/send-email');

const mocked = {
  joinWaitlistInDb: jest.mocked(joinWaitlistInDb),
  findWaitlistEntryById: jest.mocked(findWaitlistEntryById),
  removeWaitlistEntry: jest.mocked(removeWaitlistEntry),
  sendEmailInBackground: jest.mocked(sendEmailInBackground) as jest.Mock,
};

describe('waitlist service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('joinWaitlist', () => {
    it('returns the entry and sends E3 with the position', async () => {
      const entry = makeWaitlistEntry({ position: 3 });
      mocked.joinWaitlistInDb.mockResolvedValue({ ok: true, value: { entry, owner } });

      await expect(joinWaitlist('session-1', member)).resolves.toBe(entry);
      expect(builtEmails(mocked.sendEmailInBackground)[0].subject).toBe("You're on the waitlist (#3): Yoga");
    });

    it.each([
      ['SESSION_NOT_FOUND', SessionNotFoundError],
      ['SESSION_PAST', SessionPastError],
      ['SESSION_NOT_FULL', SessionNotFullError],
      ['ALREADY_BOOKED', AlreadyBookedError],
      ['ALREADY_WAITLISTED', AlreadyWaitlistedError],
    ] as const)('maps %s to its typed error', async (reason, ErrorClass) => {
      mocked.joinWaitlistInDb.mockResolvedValue({ ok: false, reason });
      await expect(joinWaitlist('session-1', member)).rejects.toBeInstanceOf(ErrorClass);
      expect(mocked.sendEmailInBackground).not.toHaveBeenCalled();
    });
  });

  describe('leaveWaitlist (owner or admin)', () => {
    it('removes the owner\'s waiting entry, and lets an admin remove it', async () => {
      mocked.findWaitlistEntryById.mockResolvedValue({ entry: makeWaitlistEntry(), owner });
      mocked.removeWaitlistEntry.mockResolvedValue(true);

      await leaveWaitlist('entry-1', member);
      await leaveWaitlist('entry-1', admin);
      expect(mocked.removeWaitlistEntry).toHaveBeenCalledTimes(2);
    });

    it('returns WAITLIST_ENTRY_NOT_FOUND for another member, a missing entry, or one no longer waiting', async () => {
      mocked.findWaitlistEntryById.mockResolvedValueOnce({ entry: makeWaitlistEntry(), owner });
      await expect(leaveWaitlist('entry-1', otherMember)).rejects.toBeInstanceOf(WaitlistEntryNotFoundError);

      mocked.findWaitlistEntryById.mockResolvedValueOnce(null);
      await expect(leaveWaitlist('entry-1', member)).rejects.toBeInstanceOf(WaitlistEntryNotFoundError);

      mocked.findWaitlistEntryById.mockResolvedValueOnce({ entry: makeWaitlistEntry({ status: 'promoted', position: null }), owner });
      await expect(leaveWaitlist('entry-1', member)).rejects.toBeInstanceOf(WaitlistEntryNotFoundError);

      expect(mocked.removeWaitlistEntry).not.toHaveBeenCalled();
    });

    it('returns WAITLIST_ENTRY_NOT_FOUND when the entry stopped waiting in the meantime', async () => {
      mocked.findWaitlistEntryById.mockResolvedValue({ entry: makeWaitlistEntry(), owner });
      mocked.removeWaitlistEntry.mockResolvedValue(false);
      await expect(leaveWaitlist('entry-1', member)).rejects.toBeInstanceOf(WaitlistEntryNotFoundError);
    });
  });
});
