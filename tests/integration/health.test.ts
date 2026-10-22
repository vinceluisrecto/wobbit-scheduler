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

  it('returns 404 for unknown routes', async () => {
    const response = await request(createApp()).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });
});
