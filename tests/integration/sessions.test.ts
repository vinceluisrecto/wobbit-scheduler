import request from 'supertest';
import { createApp } from '../../src/create-app';
import { pool } from '../../src/db/client';
import { insertBooking, insertSession, resetDatabase } from './helpers/db';
import { createUser } from './helpers/users';

const app = createApp();

describe('sessions', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('lists upcoming sessions only, ordered by start, with price and spots left', async () => {
    const later = await insertSession({ title: 'Later', startsInHours: 48, capacity: 2, priceCents: 2500 });
    const sooner = await insertSession({ title: 'Sooner', startsInHours: 2, capacity: 1, priceCents: 0 });
    await insertSession({ title: 'Past', startsInHours: -1 });
    const member = await createUser();
    await insertBooking(sooner, member.id);

    const response = await request(app).get('/api/sessions');

    expect(response.status).toBe(200);
    expect(response.body.sessions.map((s: { id: string }) => s.id)).toEqual([sooner, later]);
    expect(response.body.sessions[0]).toMatchObject({ title: 'Sooner', priceCents: 0, capacity: 1, spotsLeft: 0, isFull: true });
    expect(response.body.sessions[1]).toMatchObject({ title: 'Later', priceCents: 2500, spotsLeft: 2, isFull: false });
    expect(response.body.sessions[1].startsAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('gets one session by id, including a past one', async () => {
    const past = await insertSession({ title: 'Past', startsInHours: -1 });

    const response = await request(app).get(`/api/sessions/${past}`);

    expect(response.status).toBe(200);
    expect(response.body.session).toMatchObject({ id: past, title: 'Past', durationMinutes: 60 });
  });

  it('returns 404 SESSION_NOT_FOUND and 400 for a malformed id', async () => {
    const missing = await request(app).get('/api/sessions/00000000-0000-4000-8000-000000000000');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('SESSION_NOT_FOUND');

    const malformed = await request(app).get('/api/sessions/not-a-uuid');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('VALIDATION_ERROR');
  });
});
