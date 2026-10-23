import request from 'supertest';
import { createApp } from '../../src/create-app';
import { pool } from '../../src/db/client';

describe('GET /api/health', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('returns up when the database is reachable', async () => {
    const response = await request(createApp()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'up', database: 'up' });
  });

  it('returns 404 NOT_FOUND for unknown routes', async () => {
    const response = await request(createApp()).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  });

  it('returns 400 VALIDATION_ERROR for a malformed JSON body, without a stack trace', async () => {
    const response = await request(createApp())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'The request body must be valid JSON' },
    });
  });
});
