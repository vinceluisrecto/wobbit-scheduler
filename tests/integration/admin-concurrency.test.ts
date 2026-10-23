import type { Server } from 'node:http';
import request from 'supertest';
import { pool } from '../../src/db/client';
import { RUNS, RunLog, expectIntegrity, expectNo5xx, outcome, race, startServer, stopServer, tally } from './helpers/concurrency';
import { insertBooking, insertSession, insertWaitlistEntry, resetDatabase } from './helpers/db';
import { mockSendMail, sentEmails } from './helpers/mail';
import { createUser } from './helpers/users';

jest.mock('nodemailer', () => jest.requireActual('./helpers/mail').nodemailerMock);
jest.setTimeout(120_000);

// tasks/qa.md §A — verifies backend-admin's edit and delete transactions against parallel member bookings.
type Member = Awaited<ReturnType<typeof createUser>>;

let server: Server;
let members: Member[];
let admin: Member;

function book(sessionId: string, member: Member) {
  return request(server).post(`/api/sessions/${sessionId}/bookings`).set('Cookie', member.cookie);
}

function editSession(sessionId: string, changes: Record<string, unknown>) {
  return request(server).patch(`/api/admin/sessions/${sessionId}`).set('Cookie', admin.cookie).send(changes);
}

function deleteSession(sessionId: string) {
  return request(server).delete(`/api/admin/sessions/${sessionId}`).set('Cookie', admin.cookie);
}

// The runs rotate three timings so both sides get to win the session lock: all at once,
// the admin request 2 ms late, and the member requests spread 0–6 ms late (before, during and after the edit).
const TIMINGS = ['all at once', 'admin late', 'members late'] as const;
type Timing = (typeof TIMINGS)[number];

function later<T>(ms: number, send: () => PromiseLike<T>): () => Promise<T> {
  return () => new Promise((resolve) => setTimeout(resolve, ms)).then(() => send());
}

function adminDelay(timing: Timing): number {
  return timing === 'admin late' ? 2 : 0;
}

function memberDelay(timing: Timing, index: number): number {
  return timing === 'members late' ? index : 0;
}

async function sessionRow(sessionId: string): Promise<{ booked_count: number; capacity: number } | undefined> {
  const { rows } = await pool.query<{ booked_count: number; capacity: number }>(
    'SELECT booked_count, capacity FROM sessions WHERE id = $1',
    [sessionId],
  );
  return rows[0];
}

describe('[concurrency-real-DB] admin edits vs bookings', () => {
  beforeAll(async () => {
    await resetDatabase();
    members = await Promise.all(Array.from({ length: 16 }, () => createUser()));
    admin = await createUser({ role: 'admin' });
    server = startServer();
  });

  beforeEach(() => {
    mockSendMail.mockReset().mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await stopServer(server);
    await pool.end();
  });

  it('capacity edit vs bookings: booked_count <= capacity always, and the edit returns 200 or CAPACITY_BELOW_BOOKINGS', async () => {
    // C=5, B=3; the admin lowers capacity to 4 while 6 members book (N=7).
    const log = new RunLog('capacity 5→4 vs bookings: B=3, 1 edit + 6 bookers (N=7)');
    const holders = members.slice(0, 3);
    const bookers = members.slice(3, 9);
    const editOutcomes: Record<string, number> = {};

    for (let run = 1; run <= RUNS; run += 1) {
      const sessionId = await insertSession({ capacity: 5 });
      for (const holder of holders) await insertBooking(sessionId, holder.id);

      const timing = TIMINGS[run % 3];
      const { responses, peak } = await race([
        later(adminDelay(timing), () => editSession(sessionId, { capacity: 4 })),
        ...bookers.map((member, index) => later(memberDelay(timing, index), () => book(sessionId, member))),
      ]);
      const [editResponse, ...bookResponses] = responses;
      const row = (await sessionRow(sessionId))!;
      const booked = bookResponses.filter((response) => response.status === 201).length;
      editOutcomes[outcome(editResponse)] = (editOutcomes[outcome(editResponse)] ?? 0) + 1;
      log.add(run, tally(responses), `${timing}: edit=${outcome(editResponse)} booked_count=${row.booked_count}/${row.capacity} peak clients=${peak}`);

      expectNo5xx(responses);
      expect(['200', '409 CAPACITY_BELOW_BOOKINGS']).toContain(outcome(editResponse));
      for (const key of Object.keys(tally(bookResponses))) expect(['201', '409 SESSION_FULL']).toContain(key);
      expect(row.capacity).toBe(editResponse.status === 200 ? 4 : 5);
      expect(row.booked_count).toBe(3 + booked);
      expect(row.booked_count).toBeLessThanOrEqual(row.capacity);
      // Whichever order won, every free place was taken: the class ends full.
      expect(row.booked_count).toBe(row.capacity);
      await expectIntegrity();
    }
    log.print();
    console.log(`[concurrency-real-DB] capacity edit outcomes over ${RUNS} runs: ${JSON.stringify(editOutcomes)}`);
  });

  it('capacity increase vs bookings with a waitlist: the waiting members are promoted before any direct booking', async () => {
    // C=3 full with 2 waiting; the admin raises capacity to 6 while 7 members book (N=8).
    // 3 new places: the 2 waiting members must get 2 of them; at most 1 can go to a direct booking.
    const log = new RunLog('capacity 3→6 vs bookings: full, 2 waiting, 1 edit + 7 bookers (N=8)');
    const holders = members.slice(0, 3);
    const waiters = members.slice(3, 5);
    const bookers = members.slice(5, 12);

    for (let run = 1; run <= RUNS; run += 1) {
      const sessionId = await insertSession({ capacity: 3 });
      for (const holder of holders) await insertBooking(sessionId, holder.id);
      await insertWaitlistEntry(sessionId, waiters[0].id, 20);
      await insertWaitlistEntry(sessionId, waiters[1].id, 10);
      mockSendMail.mockClear();

      const timing = TIMINGS[run % 3];
      const { responses, peak } = await race([
        later(adminDelay(timing), () => editSession(sessionId, { capacity: 6 })),
        ...bookers.map((member, index) => later(memberDelay(timing, index), () => book(sessionId, member))),
      ]);
      const [editResponse, ...bookResponses] = responses;
      const row = (await sessionRow(sessionId))!;
      const promoted = await pool.query<{ user_id: string }>(
        `SELECT user_id FROM waitlist_entries WHERE session_id = $1 AND status = 'promoted' ORDER BY created_at`,
        [sessionId],
      );
      const direct = bookResponses.filter((response) => response.status === 201).length;
      const e4 = (await sentEmails()).filter((email) => email.subject.startsWith('You got a place!')).map((e) => e.to);
      log.add(
        run,
        tally(responses),
        `${timing}: promoted=${promoted.rows.length} direct=${direct} booked_count=${row.booked_count}/${row.capacity} E4=${e4.length} peak clients=${peak}`,
      );

      expectNo5xx(responses);
      expect(editResponse.status).toBe(200);
      expect(promoted.rows.map((r) => r.user_id)).toEqual(waiters.map((waiter) => waiter.id));
      expect(direct).toBeLessThanOrEqual(1);
      expect(row.booked_count).toBe(3 + 2 + direct);
      expect(e4.sort()).toEqual(waiters.map((waiter) => waiter.email).sort());
      await expectIntegrity();
    }
    log.print();
  });

  it('delete vs bookings: exactly one side wins, and nothing is orphaned', async () => {
    // A never-booked class; the admin deletes it while 5 members book (N=6).
    const log = new RunLog('delete vs bookings: empty C=5, 1 delete + 5 bookers (N=6)');
    const bookers = members.slice(0, 5);
    const winners: Record<string, number> = {};

    for (let run = 1; run <= RUNS; run += 1) {
      const sessionId = await insertSession({ capacity: 5 });

      const timing = TIMINGS[run % 3];
      const { responses, peak } = await race([
        later(adminDelay(timing), () => deleteSession(sessionId)),
        ...bookers.map((member, index) => later(memberDelay(timing, index), () => book(sessionId, member))),
      ]);
      const [deleteResponse, ...bookResponses] = responses;
      const row = await sessionRow(sessionId);
      const winner = deleteResponse.status === 204 ? 'delete' : 'bookings';
      winners[winner] = (winners[winner] ?? 0) + 1;
      log.add(run, tally(responses), `${timing}: winner=${winner} session ${row ? 'exists' : 'deleted'} peak clients=${peak}`);

      expectNo5xx(responses);
      if (deleteResponse.status === 204) {
        expect(row).toBeUndefined();
        expect(tally(bookResponses)).toEqual({ '404 SESSION_NOT_FOUND': 5 });
      } else {
        expect(outcome(deleteResponse)).toBe('409 SESSION_HAS_BOOKINGS');
        expect(row).toBeDefined();
        expect(tally(bookResponses)).toEqual({ '201': 5 });
      }

      const orphans = await pool.query(
        `SELECT 'booking' AS kind, b.id FROM bookings b LEFT JOIN sessions s ON s.id = b.session_id WHERE s.id IS NULL
         UNION ALL
         SELECT 'waitlist', w.id FROM waitlist_entries w LEFT JOIN sessions s ON s.id = w.session_id WHERE s.id IS NULL`,
      );
      expect(orphans.rows).toEqual([]);
      await expectIntegrity();
    }
    log.print();
    console.log(`[concurrency-real-DB] delete vs bookings winners over ${RUNS} runs: ${JSON.stringify(winners)}`);
  });
});
