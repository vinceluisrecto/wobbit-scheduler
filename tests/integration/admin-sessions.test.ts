import request from 'supertest';
import { createApp } from '../../src/create-app';
import { pool } from '../../src/db/client';
import {
  cancelBookingDirectly,
  expectSeatInvariant,
  insertBooking,
  insertSession,
  insertWaitlistEntry,
  resetDatabase,
} from './helpers/db';
import { mockSendMail, sentEmails } from './helpers/mail';
import { createUser } from './helpers/users';

jest.mock('nodemailer', () => jest.requireActual('./helpers/mail').nodemailerMock);

const app = createApp();
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

const validInput = () => ({
  title: '  Morning Flow  ',
  instructor: 'Ana',
  startsAt: hoursFromNow(48),
  durationMinutes: 60,
  capacity: 12,
  priceCents: 1500,
});

describe('admin sessions API', () => {
  let adminCookie: string;

  beforeEach(async () => {
    await resetDatabase();
    mockSendMail.mockReset().mockResolvedValue(undefined);
    adminCookie = (await createUser({ role: 'admin' })).cookie;
  });

  afterEach(async () => {
    await expectSeatInvariant();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('authorization', () => {
    const endpoints = [
      ['get', '/api/admin/sessions'],
      ['post', '/api/admin/sessions'],
      ['get', `/api/admin/sessions/${MISSING_ID}`],
      ['patch', `/api/admin/sessions/${MISSING_ID}`],
      ['delete', `/api/admin/sessions/${MISSING_ID}`],
      ['patch', `/api/admin/bookings/${MISSING_ID}/payment`],
    ] as const;

    it.each(endpoints)('%s %s → 401 logged out, 403 FORBIDDEN as a member', async (method, path) => {
      const loggedOut = await request(app)[method](path).send({});
      expect(loggedOut.status).toBe(401);
      expect(loggedOut.body.error.code).toBe('UNAUTHORIZED');

      const member = await createUser();
      const asMember = await request(app)[method](path).set('Cookie', member.cookie).send({});
      expect(asMember.status).toBe(403);
      expect(asMember.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/admin/sessions', () => {
    it('creates a class (201) that then appears in the public timetable', async () => {
      const input = validInput();
      const response = await request(app).post('/api/admin/sessions').set('Cookie', adminCookie).send(input);

      expect(response.status).toBe(201);
      expect(response.body.session).toEqual({
        id: expect.any(String),
        title: 'Morning Flow',
        instructor: 'Ana',
        startsAt: input.startsAt,
        durationMinutes: 60,
        capacity: 12,
        priceCents: 1500,
        spotsLeft: 12,
        isFull: false,
        bookedCount: 0,
        paidCount: 0,
        waitlistCount: 0,
        refundDueCount: 0,
      });

      const timetable = await request(app).get('/api/sessions');
      expect(timetable.body.sessions.map((s: { id: string }) => s.id)).toContain(response.body.session.id);
    });

    it('returns 400 with details for missing and invalid fields', async () => {
      const missing = await request(app).post('/api/admin/sessions').set('Cookie', adminCookie).send({ title: 'Only title' });
      expect(missing.status).toBe(400);
      expect(Object.keys(missing.body.error.details).sort()).toEqual(
        ['capacity', 'durationMinutes', 'instructor', 'priceCents', 'startsAt'].sort(),
      );

      const invalid = await request(app)
        .post('/api/admin/sessions')
        .set('Cookie', adminCookie)
        .send({ ...validInput(), title: ' ', durationMinutes: 601, capacity: 1.5, priceCents: -1, startsAt: 'tomorrow' });
      expect(invalid.status).toBe(400);
      expect(Object.keys(invalid.body.error.details).sort()).toEqual(
        ['capacity', 'durationMinutes', 'priceCents', 'startsAt', 'title'].sort(),
      );

      const stringNumber = await request(app)
        .post('/api/admin/sessions')
        .set('Cookie', adminCookie)
        .send({ ...validInput(), capacity: '12' });
      expect(stringNumber.body.error.details).toEqual({ capacity: expect.any(String) });
    });

    it('returns 400 for a start in the past', async () => {
      const response = await request(app)
        .post('/api/admin/sessions')
        .set('Cookie', adminCookie)
        .send({ ...validInput(), startsAt: hoursFromNow(-1) });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual({ startsAt: 'Must be in the future' });
      const { rows } = await pool.query('SELECT count(*)::int AS n FROM sessions');
      expect(rows[0].n).toBe(0);
    });
  });

  describe('GET /api/admin/sessions', () => {
    it('lists upcoming ascending (the default) and past descending', async () => {
      const later = await insertSession({ title: 'Later', startsInHours: 48 });
      const sooner = await insertSession({ title: 'Sooner', startsInHours: 2 });
      const yesterday = await insertSession({ title: 'Yesterday', startsInHours: -24 });
      const lastWeek = await insertSession({ title: 'Last week', startsInHours: -24 * 7 });

      const byDefault = await request(app).get('/api/admin/sessions').set('Cookie', adminCookie);
      const upcoming = await request(app).get('/api/admin/sessions?scope=upcoming').set('Cookie', adminCookie);
      const past = await request(app).get('/api/admin/sessions?scope=past').set('Cookie', adminCookie);

      const ids = (response: request.Response) => response.body.sessions.map((s: { id: string }) => s.id);
      expect(ids(byDefault)).toEqual([sooner, later]);
      expect(ids(upcoming)).toEqual([sooner, later]);
      expect(ids(past)).toEqual([yesterday, lastWeek]);
    });

    it('returns 400 for an unknown scope', async () => {
      const response = await request(app).get('/api/admin/sessions?scope=all').set('Cookie', adminCookie);
      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual({ scope: expect.any(String) });
    });

    it('counts booked, paid, waitlist and refund-due rows correctly', async () => {
      const sessionId = await insertSession({ capacity: 4 });
      const other = await insertSession({ capacity: 4 });
      const users = await Promise.all([1, 2, 3, 4, 5, 6, 7].map(() => createUser()));

      await insertBooking(sessionId, users[0].id, true); // confirmed + paid
      await insertBooking(sessionId, users[1].id, true); // confirmed + paid
      await insertBooking(sessionId, users[2].id); // confirmed, unpaid
      await cancelBookingDirectly(await insertBooking(sessionId, users[3].id, true)); // refund due
      await cancelBookingDirectly(await insertBooking(sessionId, users[4].id)); // cancelled, unpaid
      await insertWaitlistEntry(sessionId, users[5].id);
      const removed = await insertWaitlistEntry(sessionId, users[6].id);
      await pool.query(`UPDATE waitlist_entries SET status = 'removed' WHERE id = $1`, [removed]);
      await insertBooking(other, users[0].id, true);

      const response = await request(app).get('/api/admin/sessions').set('Cookie', adminCookie);

      const summary = response.body.sessions.find((s: { id: string }) => s.id === sessionId);
      expect(summary).toMatchObject({ bookedCount: 3, paidCount: 2, waitlistCount: 1, refundDueCount: 1, spotsLeft: 1 });
      const otherSummary = response.body.sessions.find((s: { id: string }) => s.id === other);
      expect(otherSummary).toMatchObject({ bookedCount: 1, paidCount: 1, waitlistCount: 0, refundDueCount: 0 });
    });
  });

  describe('GET /api/admin/sessions/:id', () => {
    it('returns the roster (confirmed first, then cancelled, each by time) and the waiting list in order', async () => {
      const sessionId = await insertSession({ capacity: 4 });
      const [a, b, c, d, w1, w2, w3] = await Promise.all([1, 2, 3, 4, 5, 6, 7].map(() => createUser()));

      const cancelledEarly = await insertBooking(sessionId, a.id);
      const confirmedFirst = await insertBooking(sessionId, b.id);
      const cancelledLate = await insertBooking(sessionId, c.id);
      const confirmedSecond = await insertBooking(sessionId, d.id);
      await pool.query(`UPDATE bookings SET created_at = now() - (interval '1 minute' * $2) WHERE id = $1`, [cancelledEarly, 40]);
      await pool.query(`UPDATE bookings SET created_at = now() - (interval '1 minute' * $2) WHERE id = $1`, [confirmedFirst, 30]);
      await pool.query(`UPDATE bookings SET created_at = now() - (interval '1 minute' * $2) WHERE id = $1`, [cancelledLate, 20]);
      await pool.query(`UPDATE bookings SET created_at = now() - (interval '1 minute' * $2) WHERE id = $1`, [confirmedSecond, 10]);
      await cancelBookingDirectly(cancelledEarly, 'admin');
      await cancelBookingDirectly(cancelledLate);
      await insertBooking(sessionId, (await createUser()).id); // a third confirmed booking, made last

      const second = await insertWaitlistEntry(sessionId, w2.id, 5);
      const first = await insertWaitlistEntry(sessionId, w1.id, 15);
      const removed = await insertWaitlistEntry(sessionId, w3.id, 25);
      await pool.query(`UPDATE waitlist_entries SET status = 'removed' WHERE id = $1`, [removed]);

      const response = await request(app).get(`/api/admin/sessions/${sessionId}`).set('Cookie', adminCookie);

      expect(response.status).toBe(200);
      expect(response.body.session).toMatchObject({ id: sessionId, bookedCount: 3, waitlistCount: 2 });
      const roster = response.body.bookings.map((booking: { id: string; status: string }) => [booking.id, booking.status]);
      expect(roster.slice(0, 2)).toEqual([
        [confirmedFirst, 'confirmed'],
        [confirmedSecond, 'confirmed'],
      ]);
      expect(roster[2][1]).toBe('confirmed');
      expect(roster.slice(3)).toEqual([
        [cancelledEarly, 'cancelled'],
        [cancelledLate, 'cancelled'],
      ]);
      expect(response.body.bookings[3]).toMatchObject({ name: a.name, email: a.email, cancelledBy: 'admin' });
      expect(response.body.waitlist.map((entry: { id: string; position: number }) => [entry.id, entry.position])).toEqual([
        [first, 1],
        [second, 2],
      ]);
    });

    it('returns 404 SESSION_NOT_FOUND and 400 for a malformed id', async () => {
      const missing = await request(app).get(`/api/admin/sessions/${MISSING_ID}`).set('Cookie', adminCookie);
      expect(missing.status).toBe(404);
      expect(missing.body.error.code).toBe('SESSION_NOT_FOUND');
      expect((await request(app).get('/api/admin/sessions/nope').set('Cookie', adminCookie)).status).toBe(400);
    });
  });

  describe('PATCH /api/admin/sessions/:id', () => {
    function patch(id: string, body: object) {
      return request(app).patch(`/api/admin/sessions/${id}`).set('Cookie', adminCookie).send(body);
    }

    it('updates only the fields sent (200)', async () => {
      const sessionId = await insertSession({ title: 'Old', capacity: 5, priceCents: 1000 });

      const response = await patch(sessionId, { title: ' New ', priceCents: 2000 });

      expect(response.status).toBe(200);
      expect(response.body.session).toMatchObject({ id: sessionId, title: 'New', priceCents: 2000, capacity: 5, instructor: 'Test Instructor' });
    });

    it('returns 400 for an empty body, an invalid field, or a past startsAt', async () => {
      const sessionId = await insertSession();
      expect((await patch(sessionId, {})).status).toBe(400);
      expect((await patch(sessionId, { capacity: 0 })).body.error.details).toEqual({ capacity: expect.any(String) });
      expect((await patch(sessionId, { startsAt: hoursFromNow(-2) })).body.error.details).toEqual({ startsAt: 'Must be in the future' });
    });

    it('returns 404, 409 SESSION_PAST and 409 CAPACITY_BELOW_BOOKINGS', async () => {
      expect((await patch(MISSING_ID, { title: 'X' })).body.error.code).toBe('SESSION_NOT_FOUND');

      const past = await insertSession({ startsInHours: -1 });
      const pastResponse = await patch(past, { title: 'X' });
      expect(pastResponse.status).toBe(409);
      expect(pastResponse.body.error.code).toBe('SESSION_PAST');

      const sessionId = await insertSession({ capacity: 3 });
      await insertBooking(sessionId, (await createUser()).id);
      await insertBooking(sessionId, (await createUser()).id);
      const below = await patch(sessionId, { capacity: 1 });
      expect(below.status).toBe(409);
      expect(below.body.error.code).toBe('CAPACITY_BELOW_BOOKINGS');
      expect((await patch(sessionId, { capacity: 2 })).status).toBe(200);
    });

    it('raising capacity promotes the waitlist in created_at order, inside the edit', async () => {
      const sessionId = await insertSession({ capacity: 1, title: 'Full' });
      await insertBooking(sessionId, (await createUser()).id);
      const [early, middle, late] = await Promise.all([1, 2, 3].map(() => createUser()));
      // Inserted out of order on purpose: the queue follows created_at, not insertion order.
      const lateEntry = await insertWaitlistEntry(sessionId, late.id, 1);
      const earlyEntry = await insertWaitlistEntry(sessionId, early.id, 30);
      const middleEntry = await insertWaitlistEntry(sessionId, middle.id, 10);

      const response = await patch(sessionId, { capacity: 3 });

      expect(response.status).toBe(200);
      expect(response.body.session).toMatchObject({ capacity: 3, bookedCount: 3, spotsLeft: 0, isFull: true, waitlistCount: 1 });

      const { rows } = await pool.query(
        `SELECT w.id, w.status, b.status AS booking_status, b.user_id
           FROM waitlist_entries w LEFT JOIN bookings b ON b.id = w.booking_id`,
      );
      const byId = Object.fromEntries(rows.map((row) => [row.id, row]));
      expect(byId[earlyEntry]).toMatchObject({ status: 'promoted', booking_status: 'confirmed', user_id: early.id });
      expect(byId[middleEntry]).toMatchObject({ status: 'promoted', booking_status: 'confirmed', user_id: middle.id });
      expect(byId[lateEntry]).toMatchObject({ status: 'waiting', booking_status: null });

      const booked = await pool.query('SELECT booked_count FROM sessions WHERE id = $1', [sessionId]);
      expect(booked.rows[0].booked_count).toBe(3);

      const promotedEmails = (await sentEmails()).filter((email) => email.subject.startsWith('You got a place'));
      expect(promotedEmails.map((email) => email.to).sort()).toEqual([early.email, middle.email].sort());
    });

    it('sends E6 only to confirmed members, and only for title/instructor/time/duration changes', async () => {
      const sessionId = await insertSession({ capacity: 2, title: 'Yoga' });
      const confirmed = await createUser();
      const cancelled = await createUser();
      const waiting = await createUser();
      const confirmedBooking = await insertBooking(sessionId, confirmed.id);
      await cancelBookingDirectly(await insertBooking(sessionId, cancelled.id));
      await insertBooking(sessionId, (await createUser({ email: 'second@example.com' })).id);
      await insertWaitlistEntry(sessionId, waiting.id);

      for (const change of [{ capacity: 2, priceCents: 999 }]) {
        await patch(sessionId, change);
      }
      expect(await sentEmails()).toHaveLength(0);

      for (const change of [
        { title: 'Hot Yoga' },
        { instructor: 'Marco' },
        { startsAt: hoursFromNow(72) },
        { durationMinutes: 90 },
      ]) {
        mockSendMail.mockClear();
        expect((await patch(sessionId, change)).status).toBe(200);
        const emails = await sentEmails();
        expect(emails.map((email) => email.to).sort()).toEqual([confirmed.email, 'second@example.com'].sort());
        expect(emails[0].subject).toMatch(/^Class details changed/);
      }

      const toConfirmed = (await sentEmails()).find((email) => email.to === confirmed.email)!;
      expect(toConfirmed.text).toContain(`http://localhost:3000/bookings/${confirmedBooking}`);
    });

    it('sends no E6 when a field is resent with its current value', async () => {
      const sessionId = await insertSession({ title: 'Same' });
      await insertBooking(sessionId, (await createUser()).id);

      await patch(sessionId, { title: 'Same' });
      expect(await sentEmails()).toHaveLength(0);
    });
  });

  describe('DELETE /api/admin/sessions/:id', () => {
    function remove(id: string) {
      return request(app).delete(`/api/admin/sessions/${id}`).set('Cookie', adminCookie);
    }

    it('deletes a class that never had bookings or waitlist entries (204)', async () => {
      const sessionId = await insertSession();
      expect((await remove(sessionId)).status).toBe(204);
      const { rows } = await pool.query('SELECT 1 FROM sessions WHERE id = $1', [sessionId]);
      expect(rows).toHaveLength(0);
    });

    it('returns 409 SESSION_HAS_BOOKINGS for confirmed bookings, only cancelled ones, or only waitlist entries', async () => {
      const withConfirmed = await insertSession();
      await insertBooking(withConfirmed, (await createUser()).id);

      const withCancelledOnly = await insertSession();
      await cancelBookingDirectly(await insertBooking(withCancelledOnly, (await createUser()).id));

      const withWaitlistOnly = await insertSession({ capacity: 1 });
      const waitingEntry = await insertWaitlistEntry(withWaitlistOnly, (await createUser()).id);
      await pool.query(`UPDATE waitlist_entries SET status = 'removed' WHERE id = $1`, [waitingEntry]);

      for (const id of [withConfirmed, withCancelledOnly, withWaitlistOnly]) {
        const response = await remove(id);
        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('SESSION_HAS_BOOKINGS');
      }
      const { rows } = await pool.query('SELECT count(*)::int AS n FROM sessions');
      expect(rows[0].n).toBe(3);
    });

    it('returns 404 SESSION_NOT_FOUND and 400 for a malformed id', async () => {
      const missing = await remove(MISSING_ID);
      expect(missing.status).toBe(404);
      expect(missing.body.error.code).toBe('SESSION_NOT_FOUND');
      expect((await remove('nope')).status).toBe(400);
    });
  });
});
