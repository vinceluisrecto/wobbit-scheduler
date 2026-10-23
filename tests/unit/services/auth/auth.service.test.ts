import {
  deleteUserSession,
  findUserByEmail,
  findUserWithPasswordByEmail,
  insertMember,
  insertPasswordResetToken,
  insertUserSession,
  resetPasswordWithToken,
} from '../../../../src/repositories/auth';
import { forgotPassword, login, logout, resetPassword, signup } from '../../../../src/services/auth';
import { sendEmailInBackground } from '../../../../src/services/email/send-email';
import { EmailTakenError, InvalidCredentialsError, InvalidResetTokenError } from '../../../../src/utils/errors';
import { hashPassword } from '../../../../src/utils/password';
import { admin, builtEmails, member } from '../fixtures';

jest.mock('../../../../src/repositories/auth');
jest.mock('../../../../src/services/email/send-email');

const mocked = {
  insertMember: jest.mocked(insertMember),
  findUserWithPasswordByEmail: jest.mocked(findUserWithPasswordByEmail),
  findUserByEmail: jest.mocked(findUserByEmail),
  insertUserSession: jest.mocked(insertUserSession),
  deleteUserSession: jest.mocked(deleteUserSession),
  insertPasswordResetToken: jest.mocked(insertPasswordResetToken),
  resetPasswordWithToken: jest.mocked(resetPasswordWithToken),
  sendEmailInBackground: jest.mocked(sendEmailInBackground),
};

const DAY_MS = 24 * 60 * 60 * 1000;

describe('auth service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('signup', () => {
    const input = { name: 'Maya', email: 'maya@example.com', password: 'longenough', timeZone: 'UTC' };

    it('hashes the password, starts a 30-day session and sends E1', async () => {
      mocked.insertMember.mockResolvedValue(member);

      const result = await signup(input);

      const stored = mocked.insertMember.mock.calls[0][0];
      expect(stored.passwordHash).not.toContain('longenough');
      expect(result.user).toEqual({ id: member.id, name: member.name, email: member.email, role: 'member' });
      expect(result.ttlMs).toBe(30 * DAY_MS);
      expect(mocked.insertUserSession).toHaveBeenCalledWith(expect.not.stringContaining(result.token), member.id, 30 * DAY_MS);
      expect(builtEmails(mocked.sendEmailInBackground as jest.Mock)[0]).toMatchObject({ to: member.email, subject: 'Welcome to the studio' });
    });

    it('throws EMAIL_TAKEN when the repository reports a duplicate', async () => {
      mocked.insertMember.mockResolvedValue(null);
      await expect(signup(input)).rejects.toBeInstanceOf(EmailTakenError);
      expect(mocked.sendEmailInBackground).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('starts a 12-hour session for an admin', async () => {
      mocked.findUserWithPasswordByEmail.mockResolvedValue({ user: admin, passwordHash: await hashPassword('right-password') });

      const result = await login({ email: admin.email, password: 'right-password' });

      expect(result.ttlMs).toBe(12 * 60 * 60 * 1000);
      expect(result.user.role).toBe('admin');
    });

    it('throws INVALID_CREDENTIALS for a wrong password and for an unknown email', async () => {
      mocked.findUserWithPasswordByEmail.mockResolvedValueOnce({ user: member, passwordHash: await hashPassword('right-password') });
      await expect(login({ email: member.email, password: 'wrong' })).rejects.toBeInstanceOf(InvalidCredentialsError);

      mocked.findUserWithPasswordByEmail.mockResolvedValueOnce(null);
      await expect(login({ email: 'nobody@example.com', password: 'whatever' })).rejects.toBeInstanceOf(InvalidCredentialsError);
      expect(mocked.insertUserSession).not.toHaveBeenCalled();
    });
  });

  it('logout deletes the session by its token hash', async () => {
    await logout('hash-1');
    expect(mocked.deleteUserSession).toHaveBeenCalledWith('hash-1');
  });

  describe('forgotPassword', () => {
    it('does nothing for an unknown email', async () => {
      mocked.findUserByEmail.mockResolvedValue(null);
      await forgotPassword({ email: 'nobody@example.com' });
      expect(mocked.insertPasswordResetToken).not.toHaveBeenCalled();
      expect(mocked.sendEmailInBackground).not.toHaveBeenCalled();
    });

    it('stores only the hash of a 1-hour token and emails the plain token (E7)', async () => {
      mocked.findUserByEmail.mockResolvedValue(member);

      await forgotPassword({ email: member.email });

      const [tokenHash, userId, ttl] = mocked.insertPasswordResetToken.mock.calls[0];
      expect(userId).toBe(member.id);
      expect(ttl).toBe(60 * 60 * 1000);
      const email = builtEmails(mocked.sendEmailInBackground as jest.Mock)[0];
      const token = decodeURIComponent(/token=(\S+)/.exec(email.text)![1]);
      expect(token).not.toBe(tokenHash);
      expect(email.to).toBe(member.email);
    });
  });

  describe('resetPassword', () => {
    it('throws INVALID_RESET_TOKEN when the repository refuses the token', async () => {
      mocked.resetPasswordWithToken.mockResolvedValue({ ok: false, reason: 'INVALID_RESET_TOKEN' });
      await expect(resetPassword({ token: 't', password: 'newpassword' })).rejects.toBeInstanceOf(InvalidResetTokenError);
    });

    it('passes the token hash and a new password hash', async () => {
      mocked.resetPasswordWithToken.mockResolvedValue({ ok: true, value: null });
      await resetPassword({ token: 'plain-token', password: 'newpassword' });
      const [tokenHash, passwordHash] = mocked.resetPasswordWithToken.mock.calls[0];
      expect(tokenHash).not.toBe('plain-token');
      expect(passwordHash).not.toContain('newpassword');
    });
  });
});
