import type { Server } from 'node:http';
import request from 'supertest';
import { pool } from '../../src/db/client';
import {
  RUNS,
  RunLog,
  expectIntegrity,
  expectNo5xx,
  outcome,
  race,
  startServer,
  stopServer,
  tally,
} from './helpers/concurrency';
import { insertBooking, insertSession, resetDatabase } from './helpers/db';
import { mockSendMail } from './helpers/mail';
import { createUser } from './helpers/users';

jest.mock('nodemailer', () => jest.requireActual('./helpers/mail').nodemailerMock);
jest.setTimeout(120_000);

// tasks/qa.md §A — verifies backend-member's booking transaction under real parallel requests.
type Member = Awaited<ReturnType<typeof createUser>>;

let server: Server;
let holders: Member[]; // already hold a place before the race
let bookers: Member[]; // race for the remaining places

function book(sessionId: string, member: Member) {
  return request(server).post(`/api/sessions/${sessionId}/bookings`).set('Cookie', member.cookie);
}

async function bookedCount(sessionId: string): Promise<number> {
  const { rows } = await pool.query<{ booked_count: number }>('SELECT booked_count FROM sessions WHERE id = $1', [
    sessionId,
  ]);
  return rows[0].booked_count;
}

describe('[concurrency-real-DB] bookings', () => {
  beforeAll(async () => {
    await resetDatabase();
    holders = await Promise.all(Array.from({ length: 4 }, () => createUser()));
    bookers = await Promise.all(Array.from({ length: 10 }, () => createUser()));
    server = startServer();
  });

  beforeEach(() => {
    mockSendMail.mockReset().mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await stopServer(server);
    await pool.end();
  });

  it('final seat: C=5, B=4, N=10 different members → exactly 1 × 201 and 9 × SESSION_FULL', async () => {
    const log = new RunLog('final seat: C=5 B=4 N=10');
    for (let run = 1; run <= RUNS; run += 1) {
      const sessionId = await insertSession({ capacity: 5 });
      for (const holder of holders) await insertBooking(sessionId, holder.id);

      const { responses, peak } = await race(bookers.map((member) => () => book(sessionId, member)));
      const counts = tally(responses);
      log.add(run, counts, `booked_count=${await bookedCount(sessionId)} peak clients=${peak}`);

      expectNo5xx(responses);
      expect(counts).toEqual({ '201': 1, '409 SESSION_FULL': 9 });
      expect(await bookedCount(sessionId)).toBe(5);
      await expectIntegrity();
    }
    log.print();
  });

  it('empty session: C=3, N=10 → exactly 3 × 201 and 7 × SESSION_FULL', async () => {
    const log = new RunLog('empty session: C=3 B=0 N=10');
    for (let run = 1; run <= RUNS; run += 1) {
      const sessionId = await insertSession({ capacity: 3 });

      const { responses, peak } = await race(bookers.map((member) => () => book(sessionId, member)));
      const counts = tally(responses);
      log.add(run, counts, `booked_count=${await bookedCount(sessionId)} peak clients=${peak}`);

      expectNo5xx(responses);
      expect(counts).toEqual({ '201': 3, '409 SESSION_FULL': 7 });
      expect(await bookedCount(sessionId)).toBe(3);
      await expectIntegrity();
    }
    log.print();
  });

  it('same member: 5 simultaneous requests → exactly 1 × 201 and 4 × ALREADY_BOOKED', async () => {
    const log = new RunLog('same member: C=10 B=0 N=5 (one member)');
    const member = bookers[0];
    for (let run = 1; run <= RUNS; run += 1) {
      const sessionId = await insertSession({ capacity: 10 });

      const { responses, peak } = await race(Array.from({ length: 5 }, () => () => book(sessionId, member)));
      const counts = tally(responses);
      const { rows } = await pool.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM bookings WHERE session_id = $1 AND user_id = $2`,
        [sessionId, member.id],
      );
      log.add(run, counts, `booking rows=${rows[0].count} booked_count=${await bookedCount(sessionId)} peak clients=${peak}`);

      expectNo5xx(responses);
      expect(counts).toEqual({ '201': 1, '409 ALREADY_BOOKED': 4 });
      expect(rows[0].count).toBe(1); // the losers' rollback leaves no stray rows
      expect(await bookedCount(sessionId)).toBe(1);
      await expectIntegrity();
    }
    log.print();
  });

  it('sends E2 only for the requests that got a place', async () => {
    const sessionId = await insertSession({ capacity: 2 });
    const responses = await Promise.all(bookers.map((member) => book(sessionId, member)));
    await new Promise((resolve) => setTimeout(resolve, 100));

    const winners = responses.filter((response) => response.status === 201).map((r) => r.body.booking.email);
    const recipients = mockSendMail.mock.calls.map(([message]) => (message as { to: string }).to);
    expect(responses.map(outcome).filter((o) => o === '201')).toHaveLength(2);
    expect(recipients.sort()).toEqual(winners.sort());
  });
});
