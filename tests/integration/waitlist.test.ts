import request from 'supertest';
import { createApp } from '../../src/create-app';
import { pool } from '../../src/db/client';
import { expectSeatInvariant, insertBooking, insertSession, resetDatabase } from './helpers/db';
import { mockSendMail, sentEmails } from './helpers/mail';
import { createUser } from './helpers/users';

jest.mock('nodemailer', () => jest.requireActual('./helpers/mail').nodemailerMock);

const app = createApp();

function join(sessionId: string, cookie: string) {
  return request(app).post(`/api/sessions/${sessionId}/waitlist`).set('Cookie', cookie);
}

async function fullSession(capacity = 1) {
  const sessionId = await insertSession({ capacity, title: 'Full Class' });
  const bookers = [];
  for (let i = 0; i < capacity; i += 1) {
    const booker = await createUser();
    bookers.push({ ...booker, bookingId: await insertBooking(sessionId, booker.id) });
  }
  return { sessionId, bookers };
}

describe('waitlist', () => {
  beforeEach(async () => {
    await resetDatabase();
    mockSendMail.mockReset().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await expectSeatInvariant();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/sessions/:id/waitlist', () => {
    it('returns 401 when logged out', async () => {
      const { sessionId } = await fullSession();
      expect((await request(app).post(`/api/sessions/${sessionId}/waitlist`)).status).toBe(401);
    });

    it('joins a full class with positions 1 then 2, and sends E3 with the position', async () => {
      const { sessionId } = await fullSession();
      const first = await createUser();
      const second = await createUser();

      const one = await join(sessionId, first.cookie);
      const two = await join(sessionId, second.cookie);

      expect(one.status).toBe(201);
      expect(one.body.waitlistEntry).toMatchObject({ sessionId, userId: first.id, status: 'waiting', position: 1, bookingId: null });
      expect(one.body.waitlistEntry.session.isFull).toBe(true);
      expect(two.body.waitlistEntry.position).toBe(2);

      const emails = await sentEmails();
      expect(emails.map((email) => email.subject)).toEqual([
        "You're on the waitlist (#1): Full Class",
        "You're on the waitlist (#2): Full Class",
      ]);
      expect(emails[0].text).toContain('http://localhost:3000/account');
    });

    it('returns SESSION_NOT_FULL, ALREADY_BOOKED, ALREADY_WAITLISTED, SESSION_PAST and SESSION_NOT_FOUND', async () => {
      const open = await insertSession({ capacity: 5 });
      const member = await createUser();
      expect((await join(open, member.cookie)).body.error.code).toBe('SESSION_NOT_FULL');

      const { sessionId, bookers } = await fullSession();
      const booked = await join(sessionId, bookers[0].cookie);
      expect(booked.status).toBe(409);
      expect(booked.body.error.code).toBe('ALREADY_BOOKED');

      await join(sessionId, member.cookie);
      const twice = await join(sessionId, member.cookie);
      expect(twice.status).toBe(409);
      expect(twice.body.error.code).toBe('ALREADY_WAITLISTED');

      const past = await insertSession({ startsInHours: -1 });
      expect((await join(past, member.cookie)).body.error.code).toBe('SESSION_PAST');

      const missing = await join('00000000-0000-4000-8000-000000000000', member.cookie);
      expect(missing.status).toBe(404);
      expect(missing.body.error.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('promotion on cancel', () => {
    it('books the first waiting member in the same transaction and sends E4 only to them', async () => {
      const { sessionId, bookers } = await fullSession();
      const first = await createUser();
      const second = await createUser();
      const firstEntry = (await join(sessionId, first.cookie)).body.waitlistEntry;
      await join(sessionId, second.cookie);
      mockSendMail.mockClear();

      const cancel = await request(app).post(`/api/bookings/${bookers[0].bookingId}/cancel`).set('Cookie', bookers[0].cookie);

      expect(cancel.status).toBe(200);
      expect(cancel.body.booking.session.isFull).toBe(true);

      const { rows } = await pool.query(
        `SELECT w.id, w.user_id, w.status, b.status AS booking_status
           FROM waitlist_entries w LEFT JOIN bookings b ON b.id = w.booking_id ORDER BY w.created_at`,
      );
      expect(rows[0]).toMatchObject({ id: firstEntry.id, user_id: first.id, status: 'promoted', booking_status: 'confirmed' });
      expect(rows[1]).toMatchObject({ user_id: second.id, status: 'waiting', booking_status: null });

      const promotedEmails = (await sentEmails()).filter((email) => email.subject.startsWith('You got a place'));
      expect(promotedEmails).toHaveLength(1);
      expect(promotedEmails[0].to).toBe(first.email);
      const promotedBooking = await pool.query('SELECT booking_id FROM waitlist_entries WHERE id = $1', [firstEntry.id]);
      expect(promotedEmails[0].text).toContain(`http://localhost:3000/bookings/${promotedBooking.rows[0].booking_id}`);

      const account = await request(app).get('/api/account/bookings').set('Cookie', second.cookie);
      expect(account.body.upcoming.waitlist[0].position).toBe(1);
    });
  });

  describe('DELETE /api/waitlist/:id', () => {
    it('lets the owner leave (204), then 404 because it is no longer waiting', async () => {
      const { sessionId } = await fullSession();
      const member = await createUser();
      const entryId = (await join(sessionId, member.cookie)).body.waitlistEntry.id;

      const leave = await request(app).delete(`/api/waitlist/${entryId}`).set('Cookie', member.cookie);
      expect(leave.status).toBe(204);
      const { rows } = await pool.query('SELECT status FROM waitlist_entries WHERE id = $1', [entryId]);
      expect(rows[0].status).toBe('removed');

      const again = await request(app).delete(`/api/waitlist/${entryId}`).set('Cookie', member.cookie);
      expect(again.status).toBe(404);
      expect(again.body.error.code).toBe('WAITLIST_ENTRY_NOT_FOUND');
    });

    it('returns 404 to another member (entry unchanged) and lets an admin remove it', async () => {
      const { sessionId } = await fullSession();
      const member = await createUser();
      const entryId = (await join(sessionId, member.cookie)).body.waitlistEntry.id;

      const asOther = await request(app).delete(`/api/waitlist/${entryId}`).set('Cookie', (await createUser()).cookie);
      expect(asOther.status).toBe(404);
      const before = await pool.query('SELECT status FROM waitlist_entries WHERE id = $1', [entryId]);
      expect(before.rows[0].status).toBe('waiting');

      const admin = await createUser({ role: 'admin' });
      expect((await request(app).delete(`/api/waitlist/${entryId}`).set('Cookie', admin.cookie)).status).toBe(204);
    });

    it('returns 401 when logged out and 400 for a malformed id', async () => {
      expect((await request(app).delete('/api/waitlist/00000000-0000-4000-8000-000000000000')).status).toBe(401);
      const member = await createUser();
      expect((await request(app).delete('/api/waitlist/nope').set('Cookie', member.cookie)).status).toBe(400);
    });
  });
});
