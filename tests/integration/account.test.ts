import request from 'supertest';
import { createApp } from '../../src/create-app';
import { pool } from '../../src/db/client';
import { expectSeatInvariant, insertBooking, insertSession, resetDatabase } from './helpers/db';
import { createUser } from './helpers/users';

jest.mock('nodemailer', () => jest.requireActual('./helpers/mail').nodemailerMock);

const app = createApp();

describe('GET /api/account/bookings', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterEach(async () => {
    await expectSeatInvariant();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('returns 401 when logged out', async () => {
    expect((await request(app).get('/api/account/bookings')).status).toBe(401);
  });

  it('splits upcoming and past, includes cancelled bookings and waitlist positions, and only my data', async () => {
    const me = await createUser();
    const other = await createUser();

    const soon = await insertSession({ title: 'Soon', startsInHours: 2 });
    const later = await insertSession({ title: 'Later', startsInHours: 48 });
    const yesterday = await insertSession({ title: 'Yesterday', startsInHours: -24 });
    const lastWeek = await insertSession({ title: 'Last week', startsInHours: -24 * 7 });
    const full = await insertSession({ title: 'Full', startsInHours: 24, capacity: 1 });

    await insertBooking(later, me.id);
    const cancelledId = await insertBooking(soon, me.id);
    await request(app).post(`/api/bookings/${cancelledId}/cancel`).set('Cookie', me.cookie);
    await insertBooking(yesterday, me.id);
    await insertBooking(lastWeek, me.id);
    await insertBooking(full, other.id);
    await insertBooking(soon, other.id);
    await request(app).post(`/api/sessions/${full}/waitlist`).set('Cookie', me.cookie);

    const response = await request(app).get('/api/account/bookings').set('Cookie', me.cookie);

    expect(response.status).toBe(200);
    const { upcoming, past } = response.body;
    expect(upcoming.bookings.map((b: { session: { title: string } }) => b.session.title)).toEqual(['Soon', 'Later']);
    expect(upcoming.bookings[0]).toMatchObject({ status: 'cancelled', cancelledBy: 'member', userId: me.id });
    expect(upcoming.waitlist).toHaveLength(1);
    expect(upcoming.waitlist[0]).toMatchObject({ status: 'waiting', position: 1, userId: me.id });
    expect(upcoming.waitlist[0].session.title).toBe('Full');
    expect(past.bookings.map((b: { session: { title: string } }) => b.session.title)).toEqual(['Yesterday', 'Last week']);

    const everything = [...upcoming.bookings, ...upcoming.waitlist, ...past.bookings];
    expect(everything.every((item: { userId: string }) => item.userId === me.id)).toBe(true);
  });
});
