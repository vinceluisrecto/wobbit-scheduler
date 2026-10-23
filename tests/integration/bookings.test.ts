import request from 'supertest';
import { createApp } from '../../src/create-app';
import { pool } from '../../src/db/client';
import { expectSeatInvariant, insertBooking, insertSession, resetDatabase } from './helpers/db';
import { mockSendMail, sentEmails } from './helpers/mail';
import { createUser } from './helpers/users';

jest.mock('nodemailer', () => jest.requireActual('./helpers/mail').nodemailerMock);

const app = createApp();

function book(sessionId: string, cookie?: string) {
  const req = request(app).post(`/api/sessions/${sessionId}/bookings`);
  return cookie ? req.set('Cookie', cookie) : req;
}

describe('bookings', () => {
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

  describe('POST /api/sessions/:id/bookings', () => {
    it('returns 401 when logged out', async () => {
      const sessionId = await insertSession();
      const response = await book(sessionId);
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('books a place (201) and sends E2 with the booking link, in the member timezone', async () => {
      const sessionId = await insertSession({ title: 'Yoga', capacity: 2 });
      const member = await createUser({ timeZone: 'Asia/Manila' });

      const response = await book(sessionId, member.cookie);

      expect(response.status).toBe(201);
      const { booking } = response.body;
      expect(booking).toMatchObject({
        sessionId,
        userId: member.id,
        name: member.name,
        email: member.email,
        status: 'confirmed',
        cancelledAt: null,
        cancelledBy: null,
        paymentStatus: 'unpaid',
        paidAt: null,
      });
      expect(booking.session).toMatchObject({ id: sessionId, spotsLeft: 1, isFull: false });

      const emails = await sentEmails();
      expect(emails).toHaveLength(1);
      expect(emails[0].to).toBe(member.email);
      expect(emails[0].subject).toBe('Booking confirmed: Yoga');
      expect(emails[0].text).toContain(`http://localhost:3000/bookings/${booking.id}`);
      expect(emails[0].text).toMatch(/GMT\+8/);
    });

    it('still returns 201 when sending the email fails, and logs it', async () => {
      const sessionId = await insertSession();
      const member = await createUser();
      mockSendMail.mockRejectedValue(new Error('SMTP is down'));
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      const response = await book(sessionId, member.cookie);
      await sentEmails();

      expect(response.status).toBe(201);
      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('failed'), expect.any(Error));
      consoleError.mockRestore();
    });

    it('returns 409 SESSION_FULL when no places are left', async () => {
      const sessionId = await insertSession({ capacity: 1 });
      await insertBooking(sessionId, (await createUser()).id);

      const response = await book(sessionId, (await createUser()).cookie);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('SESSION_FULL');
    });

    it('returns 409 SESSION_PAST for a class that has started', async () => {
      const sessionId = await insertSession({ startsInHours: -1 });
      const response = await book(sessionId, (await createUser()).cookie);
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('SESSION_PAST');
    });

    it('returns 409 ALREADY_BOOKED for a second booking, also when the class is now full', async () => {
      const sessionId = await insertSession({ capacity: 2 });
      const member = await createUser();
      expect((await book(sessionId, member.cookie)).status).toBe(201);

      const again = await book(sessionId, member.cookie);
      expect(again.status).toBe(409);
      expect(again.body.error.code).toBe('ALREADY_BOOKED');

      await insertBooking(sessionId, (await createUser()).id);
      const whenFull = await book(sessionId, member.cookie);
      expect(whenFull.body.error.code).toBe('ALREADY_BOOKED');
    });

    it('returns 404 for an unknown class and 400 for a malformed id', async () => {
      const member = await createUser();
      const missing = await book('00000000-0000-4000-8000-000000000000', member.cookie);
      expect(missing.status).toBe(404);
      expect(missing.body.error.code).toBe('SESSION_NOT_FOUND');
      expect((await book('nope', member.cookie)).status).toBe(400);
    });
  });

  describe('GET /api/bookings/:id', () => {
    it('is visible to the owner and an admin, and 404 to another member', async () => {
      const sessionId = await insertSession();
      const owner = await createUser();
      const bookingId = await insertBooking(sessionId, owner.id);

      expect((await request(app).get(`/api/bookings/${bookingId}`).set('Cookie', owner.cookie)).status).toBe(200);
      const admin = await createUser({ role: 'admin' });
      const asAdmin = await request(app).get(`/api/bookings/${bookingId}`).set('Cookie', admin.cookie);
      expect(asAdmin.status).toBe(200);
      expect(asAdmin.body.booking.id).toBe(bookingId);

      const other = await createUser();
      const asOther = await request(app).get(`/api/bookings/${bookingId}`).set('Cookie', other.cookie);
      expect(asOther.status).toBe(404);
      expect(asOther.body.error.code).toBe('BOOKING_NOT_FOUND');
      expect((await request(app).get(`/api/bookings/${bookingId}`)).status).toBe(401);
    });
  });

  describe('POST /api/bookings/:id/cancel', () => {
    function cancel(bookingId: string, cookie: string) {
      return request(app).post(`/api/bookings/${bookingId}/cancel`).set('Cookie', cookie);
    }

    it('lets the owner cancel (cancelledBy member), frees the place, sends E5 "you cancelled"', async () => {
      const sessionId = await insertSession({ capacity: 1 });
      const owner = await createUser();
      const bookingId = await insertBooking(sessionId, owner.id);

      const response = await cancel(bookingId, owner.cookie);

      expect(response.status).toBe(200);
      expect(response.body.booking).toMatchObject({ status: 'cancelled', cancelledBy: 'member' });
      expect(response.body.booking.cancelledAt).toEqual(expect.any(String));
      expect(response.body.booking.session.spotsLeft).toBe(1);
      const emails = await sentEmails();
      expect(emails).toHaveLength(1);
      expect(emails[0]).toMatchObject({ to: owner.email, subject: expect.stringContaining('Booking cancelled') });
      expect(emails[0].text).toContain('You cancelled');
      expect(emails[0].text).toContain('http://localhost:3000/account');
    });

    it('lets an admin cancel (cancelledBy admin) with the "studio cancelled" wording', async () => {
      const sessionId = await insertSession();
      const owner = await createUser();
      const bookingId = await insertBooking(sessionId, owner.id);
      const admin = await createUser({ role: 'admin' });

      const response = await cancel(bookingId, admin.cookie);

      expect(response.status).toBe(200);
      expect(response.body.booking.cancelledBy).toBe('admin');
      const emails = await sentEmails();
      expect(emails[0].to).toBe(owner.email);
      expect(emails[0].text).toContain('The studio cancelled');
    });

    it('returns 404 to another member and leaves the booking untouched', async () => {
      const sessionId = await insertSession();
      const bookingId = await insertBooking(sessionId, (await createUser()).id);

      const response = await cancel(bookingId, (await createUser()).cookie);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOOKING_NOT_FOUND');
      const { rows } = await pool.query('SELECT status FROM bookings WHERE id = $1', [bookingId]);
      expect(rows[0].status).toBe('confirmed');
    });

    it('returns 409 BOOKING_ALREADY_CANCELLED the second time', async () => {
      const sessionId = await insertSession();
      const owner = await createUser();
      const bookingId = await insertBooking(sessionId, owner.id);
      await cancel(bookingId, owner.cookie);

      const again = await cancel(bookingId, owner.cookie);
      expect(again.status).toBe(409);
      expect(again.body.error.code).toBe('BOOKING_ALREADY_CANCELLED');
    });

    it('returns 409 SESSION_PAST once the class has started', async () => {
      const sessionId = await insertSession({ startsInHours: -1 });
      const owner = await createUser();
      const bookingId = await insertBooking(sessionId, owner.id);

      const response = await cancel(bookingId, owner.cookie);
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('SESSION_PAST');
    });

    it('lets a member book again after cancelling', async () => {
      const sessionId = await insertSession();
      const owner = await createUser();
      const first = await book(sessionId, owner.cookie);
      await cancel(first.body.booking.id, owner.cookie);

      const again = await book(sessionId, owner.cookie);
      expect(again.status).toBe(201);
      expect(again.body.booking.id).not.toBe(first.body.booking.id);
    });

    it('sends E8 to every admin when a paid booking is cancelled', async () => {
      const sessionId = await insertSession({ title: 'Pilates' });
      const owner = await createUser({ name: 'Paid Member' });
      const bookingId = await insertBooking(sessionId, owner.id, true);
      const adminA = await createUser({ role: 'admin' });
      const adminB = await createUser({ role: 'admin' });

      const response = await cancel(bookingId, owner.cookie);

      expect(response.body.booking.paymentStatus).toBe('paid');
      const refundEmails = (await sentEmails()).filter((email) => email.subject.startsWith('Refund due'));
      expect(refundEmails.map((email) => email.to).sort()).toEqual([adminA.email, adminB.email].sort());
      expect(refundEmails[0].subject).toBe('Refund due: Paid Member, Pilates');
      expect(refundEmails[0].text).toContain(`http://localhost:3000/admin/sessions/${sessionId}`);
    });

    it('sends no E8 for an unpaid booking', async () => {
      const sessionId = await insertSession();
      const owner = await createUser();
      await createUser({ role: 'admin' });
      const bookingId = await insertBooking(sessionId, owner.id);

      await cancel(bookingId, owner.cookie);
      const emails = await sentEmails();
      expect(emails.some((email) => email.subject.startsWith('Refund due'))).toBe(false);
    });
  });
});
