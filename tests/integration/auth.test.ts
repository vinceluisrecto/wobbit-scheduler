import request from 'supertest';
import { createApp } from '../../src/create-app';
import { pool } from '../../src/db/client';
import { generateToken, hashToken } from '../../src/utils/token';
import { resetDatabase } from './helpers/db';
import { mockSendMail, sentEmails } from './helpers/mail';
import { TEST_PASSWORD, createUser } from './helpers/users';

jest.mock('nodemailer', () => jest.requireActual('./helpers/mail').nodemailerMock);

const app = createApp();
const DAY_MS = 24 * 60 * 60 * 1000;

function cookieFrom(response: request.Response): string {
  const header = response.headers['set-cookie'] as unknown as string[];
  return header[0].split(';')[0];
}

async function sessionTtlMs(userId: string): Promise<number> {
  const { rows } = await pool.query<{ ms: number }>(
    'SELECT extract(epoch FROM expires_at - now()) * 1000 AS ms FROM user_sessions WHERE user_id = $1',
    [userId],
  );
  return Number(rows[0].ms);
}

describe('auth', () => {
  beforeEach(async () => {
    await resetDatabase();
    mockSendMail.mockReset().mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/auth/signup', () => {
    it('creates a member, sets an HttpOnly SameSite=Lax cookie, stores the timezone and sends E1', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({ name: '  Maya  ', email: 'Maya@Example.com', password: 'longenough', timeZone: 'Asia/Manila' });

      expect(response.status).toBe(201);
      expect(response.body.user).toEqual({ id: expect.any(String), name: 'Maya', email: 'maya@example.com', role: 'member' });
      const cookie = (response.headers['set-cookie'] as unknown as string[])[0];
      expect(cookie).toMatch(/^session=/);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Lax/);
      expect(cookie).not.toMatch(/Secure/);

      const { rows } = await pool.query('SELECT password_hash, time_zone FROM users');
      expect(rows[0].password_hash).not.toContain('longenough');
      expect(rows[0].password_hash).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
      expect(rows[0].time_zone).toBe('Asia/Manila');

      const emails = await sentEmails();
      expect(emails).toHaveLength(1);
      expect(emails[0]).toMatchObject({ to: 'maya@example.com', subject: 'Welcome to the studio' });
      expect(emails[0].text).toContain('http://localhost:3000/sessions');
    });

    it('falls back to UTC for a missing or invalid timezone', async () => {
      await request(app).post('/api/auth/signup').send({ name: 'A', email: 'a@example.com', password: 'longenough', timeZone: 'Mars/Base' });
      const { rows } = await pool.query('SELECT time_zone FROM users');
      expect(rows[0].time_zone).toBe('UTC');
    });

    it('returns 409 EMAIL_TAKEN for the same email in any case', async () => {
      await createUser({ email: 'taken@example.com' });

      const response = await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Other', email: 'TAKEN@example.com', password: 'longenough' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('returns 400 with field details for invalid input', async () => {
      const response = await request(app).post('/api/auth/signup').send({ name: '', email: 'nope', password: 'short' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(Object.keys(response.body.error.details).sort()).toEqual(['email', 'name', 'password']);
    });

    it('gives members a 30-day session', async () => {
      const response = await request(app).post('/api/auth/signup').send({ name: 'M', email: 'm@example.com', password: 'longenough' });

      const ttl = await sessionTtlMs(response.body.user.id);
      expect(ttl).toBeGreaterThan(30 * DAY_MS - 60_000);
      expect(ttl).toBeLessThanOrEqual(30 * DAY_MS);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with the right password (email is case-insensitive)', async () => {
      const user = await createUser({ email: 'login@example.com' });

      const response = await request(app).post('/api/auth/login').send({ email: 'LOGIN@example.com', password: TEST_PASSWORD });

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(user.id);
      expect(cookieFrom(response)).toMatch(/^session=.+/);
    });

    it('returns the same 401 for an unknown email and a wrong password', async () => {
      await createUser({ email: 'known@example.com' });

      const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'known@example.com', password: 'wrong-password' });
      const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'unknown@example.com', password: TEST_PASSWORD });

      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(wrongPassword.body).toEqual(unknownEmail.body);
      expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('gives admins a 12-hour session', async () => {
      const admin = await createUser({ role: 'admin', email: 'admin@example.com' });
      await pool.query('DELETE FROM user_sessions');

      await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: TEST_PASSWORD });

      const ttl = await sessionTtlMs(admin.id);
      expect(ttl).toBeGreaterThan(12 * 60 * 60 * 1000 - 60_000);
      expect(ttl).toBeLessThanOrEqual(12 * 60 * 60 * 1000);
    });
  });

  describe('GET /api/auth/me and POST /api/auth/logout', () => {
    it('returns the user, then 401 after logout invalidates the session', async () => {
      const user = await createUser();

      const me = await request(app).get('/api/auth/me').set('Cookie', user.cookie);
      expect(me.status).toBe(200);
      expect(me.body.user).toEqual({ id: user.id, name: user.name, email: user.email, role: 'member' });

      const logout = await request(app).post('/api/auth/logout').set('Cookie', user.cookie);
      expect(logout.status).toBe(204);
      expect((logout.headers['set-cookie'] as unknown as string[])[0]).toMatch(/session=;/);

      const after = await request(app).get('/api/auth/me').set('Cookie', user.cookie);
      expect(after.status).toBe(401);
      expect(after.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 without a cookie, with an unknown token, and with an expired session', async () => {
      const user = await createUser();
      await pool.query(`UPDATE user_sessions SET expires_at = now() - interval '1 second'`);

      expect((await request(app).get('/api/auth/me')).status).toBe(401);
      expect((await request(app).get('/api/auth/me').set('Cookie', 'session=unknown')).status).toBe(401);
      expect((await request(app).get('/api/auth/me').set('Cookie', user.cookie)).status).toBe(401);
      expect((await request(app).post('/api/auth/logout')).status).toBe(401);
    });
  });

  describe('forgot and reset password', () => {
    it('returns 204 for every email but sends E7 only for a known one', async () => {
      await createUser({ email: 'known@example.com' });

      const known = await request(app).post('/api/auth/forgot-password').send({ email: 'Known@example.com' });
      const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });

      expect(known.status).toBe(204);
      expect(unknown.status).toBe(204);
      const emails = await sentEmails();
      expect(emails).toHaveLength(1);
      expect(emails[0].to).toBe('known@example.com');
      expect(emails[0].text).toMatch(/http:\/\/localhost:3000\/reset-password\?token=\S+/);
    });

    async function requestResetToken(email: string): Promise<string> {
      await request(app).post('/api/auth/forgot-password').send({ email });
      const emails = await sentEmails();
      return decodeURIComponent(/token=(\S+)/.exec(emails[emails.length - 1].text)![1]);
    }

    it('resets the password once, logs the user out everywhere, and rejects reuse', async () => {
      const user = await createUser({ email: 'reset@example.com' });
      const token = await requestResetToken('reset@example.com');

      const reset = await request(app).post('/api/auth/reset-password').send({ token, password: 'brand-new-pass' });
      expect(reset.status).toBe(204);

      expect((await request(app).get('/api/auth/me').set('Cookie', user.cookie)).status).toBe(401);
      expect((await request(app).post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD })).status).toBe(401);
      expect((await request(app).post('/api/auth/login').send({ email: user.email, password: 'brand-new-pass' })).status).toBe(200);

      const reuse = await request(app).post('/api/auth/reset-password').send({ token, password: 'another-pass-1' });
      expect(reuse.status).toBe(400);
      expect(reuse.body.error.code).toBe('INVALID_RESET_TOKEN');
    });

    it('rejects unknown and expired tokens with INVALID_RESET_TOKEN', async () => {
      const user = await createUser();
      const expired = generateToken();
      await pool.query(
        `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, now() - interval '1 minute')`,
        [hashToken(expired), user.id],
      );

      for (const token of ['unknown-token', expired]) {
        const response = await request(app).post('/api/auth/reset-password').send({ token, password: 'brand-new-pass' });
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_RESET_TOKEN');
      }
    });

    it('validates the new password', async () => {
      const response = await request(app).post('/api/auth/reset-password').send({ token: 'x', password: 'short' });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
