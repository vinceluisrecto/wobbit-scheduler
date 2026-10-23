import request from 'supertest';
import { createApp } from '../../src/create-app';
import { pool } from '../../src/db/client';
import { expectSeatInvariant, insertBooking, insertSession, resetDatabase } from './helpers/db';
import { mockSendMail } from './helpers/mail';
import { createUser } from './helpers/users';

jest.mock('nodemailer', () => jest.requireActual('./helpers/mail').nodemailerMock);

const app = createApp();

describe('PATCH /api/admin/bookings/:id/payment', () => {
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

  function setPayment(bookingId: string, body: object, cookie = adminCookie) {
    return request(app).patch(`/api/admin/bookings/${bookingId}/payment`).set('Cookie', cookie).send(body);
  }

  it('returns 401 logged out and 403 FORBIDDEN for a member, without changing anything', async () => {
    const owner = await createUser();
    const bookingId = await insertBooking(await insertSession(), owner.id);

    expect((await request(app).patch(`/api/admin/bookings/${bookingId}/payment`).send({ paymentStatus: 'paid' })).status).toBe(401);
    const asOwner = await setPayment(bookingId, { paymentStatus: 'paid' }, owner.cookie);
    expect(asOwner.status).toBe(403);
    expect(asOwner.body.error.code).toBe('FORBIDDEN');

    const { rows } = await pool.query('SELECT payment_status FROM bookings WHERE id = $1', [bookingId]);
    expect(rows[0].payment_status).toBe('unpaid');
  });

  it("'paid' sets paidAt and 'unpaid' clears it", async () => {
    const sessionId = await insertSession();
    const bookingId = await insertBooking(sessionId, (await createUser()).id);

    const paid = await setPayment(bookingId, { paymentStatus: 'paid' });
    expect(paid.status).toBe(200);
    expect(paid.body.booking).toMatchObject({ id: bookingId, paymentStatus: 'paid', paidAt: expect.any(String) });
    expect(paid.body.booking.session.id).toBe(sessionId);

    const unpaid = await setPayment(bookingId, { paymentStatus: 'unpaid' });
    expect(unpaid.status).toBe(200);
    expect(unpaid.body.booking).toMatchObject({ paymentStatus: 'unpaid', paidAt: null });
  });

  it('makes a cancelled + paid booking count as refund due', async () => {
    const sessionId = await insertSession();
    const owner = await createUser();
    const bookingId = await insertBooking(sessionId, owner.id);
    await setPayment(bookingId, { paymentStatus: 'paid' });
    await request(app).post(`/api/bookings/${bookingId}/cancel`).set('Cookie', owner.cookie);

    const refundDue = async () => {
      const list = await request(app).get('/api/admin/sessions').set('Cookie', adminCookie);
      return list.body.sessions.find((s: { id: string }) => s.id === sessionId).refundDueCount;
    };
    expect(await refundDue()).toBe(1);

    // Refunded outside the app: marking it unpaid clears "Refund due".
    expect((await setPayment(bookingId, { paymentStatus: 'unpaid' })).status).toBe(200);
    expect(await refundDue()).toBe(0);
  });

  it('returns 404 BOOKING_NOT_FOUND and 400 for a bad status or id', async () => {
    const missing = await setPayment('00000000-0000-4000-8000-000000000000', { paymentStatus: 'paid' });
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('BOOKING_NOT_FOUND');

    const bookingId = await insertBooking(await insertSession(), (await createUser()).id);
    const badStatus = await setPayment(bookingId, { paymentStatus: 'refunded' });
    expect(badStatus.status).toBe(400);
    expect(badStatus.body.error.details).toEqual({ paymentStatus: expect.any(String) });
    expect((await setPayment('nope', { paymentStatus: 'paid' })).status).toBe(400);
  });
});
