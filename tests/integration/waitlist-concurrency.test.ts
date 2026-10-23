import type { Server } from 'node:http';
import request from 'supertest';
import { pool } from '../../src/db/client';
import { RUNS, RunLog, expectIntegrity, expectNo5xx, race, startServer, stopServer, tally } from './helpers/concurrency';
import { insertBooking, insertSession, insertWaitlistEntry, resetDatabase } from './helpers/db';
import { mockSendMail, sentEmails } from './helpers/mail';
import { createUser } from './helpers/users';

jest.mock('nodemailer', () => jest.requireActual('./helpers/mail').nodemailerMock);
jest.setTimeout(120_000);

// tasks/qa.md §A — verifies backend-member's cancel + promoteFromWaitlist and join-waitlist under real parallel requests.
type Member = Awaited<ReturnType<typeof createUser>>;

let server: Server;
let members: Member[];
let admin: Member;

function book(sessionId: string, member: Member) {
  return request(server).post(`/api/sessions/${sessionId}/bookings`).set('Cookie', member.cookie);
}

function joinWaitlist(sessionId: string, member: Member) {
  return request(server).post(`/api/sessions/${sessionId}/waitlist`).set('Cookie', member.cookie);
}

function cancel(bookingId: string, caller: Member) {
  return request(server).post(`/api/bookings/${bookingId}/cancel`).set('Cookie', caller.cookie);
}

interface SeatState {
  bookedCount: number;
  capacity: number;
  waiting: string[]; // user ids still waiting, in queue order
  promoted: string[]; // user ids promoted
}

async function seatState(sessionId: string): Promise<SeatState> {
  const session = await pool.query<{ booked_count: number; capacity: number }>(
    'SELECT booked_count, capacity FROM sessions WHERE id = $1',
    [sessionId],
  );
  const entries = await pool.query<{ user_id: string; status: string }>(
    `SELECT user_id, status FROM waitlist_entries WHERE session_id = $1 ORDER BY created_at, id`,
    [sessionId],
  );
  return {
    bookedCount: session.rows[0].booked_count,
    capacity: session.rows[0].capacity,
    waiting: entries.rows.filter((row) => row.status === 'waiting').map((row) => row.user_id),
    promoted: entries.rows.filter((row) => row.status === 'promoted').map((row) => row.user_id),
  };
}

function joinDelay(timing: 'all at once' | 'joins late' | 'half late', index: number): number {
  if (timing === 'all at once') return 0;
  if (timing === 'joins late') return 2;
  return index % 2 === 0 ? 0 : 2;
}

async function confirmedCount(sessionId: string, userId: string): Promise<number> {
  const { rows } = await pool.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM bookings WHERE session_id = $1 AND user_id = $2 AND status = 'confirmed'`,
    [sessionId, userId],
  );
  return rows[0].count;
}

// A full class: `capacity` members booked (returns their booking ids).
async function fullClass(capacity: number, holders: Member[]): Promise<{ sessionId: string; bookingIds: string[] }> {
  const sessionId = await insertSession({ capacity });
  const bookingIds: string[] = [];
  for (const holder of holders.slice(0, capacity)) bookingIds.push(await insertBooking(sessionId, holder.id));
  return { sessionId, bookingIds };
}

function recipientsOf(subjectStart: string, emails: { to: string; subject: string }[]): string[] {
  return emails.filter((email) => email.subject.startsWith(subjectStart)).map((email) => email.to);
}

describe('[concurrency-real-DB] waitlist and cancellation', () => {
  beforeAll(async () => {
    await resetDatabase();
    members = await Promise.all(Array.from({ length: 20 }, () => createUser()));
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

  it('cancel vs public bookings: the waiting member always gets the place, and all 9 bookers get SESSION_FULL', async () => {
    const log = new RunLog('cancel vs bookings: C=5 full, 1 waiting, 1 cancel + 9 bookers (N=10)');
    const holders = members.slice(0, 5);
    const waiter = members[5];
    const bookers = members.slice(6, 15);

    for (let run = 1; run <= RUNS; run += 1) {
      const { sessionId, bookingIds } = await fullClass(5, holders);
      await insertWaitlistEntry(sessionId, waiter.id);

      const { responses, peak } = await race([
        () => cancel(bookingIds[0], holders[0]),
        ...bookers.map((member) => () => book(sessionId, member)),
      ]);
      const [cancelResponse, ...bookResponses] = responses;
      const state = await seatState(sessionId);
      log.add(
        run,
        tally(responses),
        `promoted=${state.promoted.length} waiter booked=${await confirmedCount(sessionId, waiter.id)} booked_count=${state.bookedCount} peak clients=${peak}`,
      );

      expectNo5xx(responses);
      expect(cancelResponse.status).toBe(200);
      expect(tally(bookResponses)).toEqual({ '409 SESSION_FULL': 9 });
      expect(state.promoted).toEqual([waiter.id]);
      expect(await confirmedCount(sessionId, waiter.id)).toBe(1);
      expect(state.bookedCount).toBe(5);
      await expectIntegrity();
    }
    log.print();
  });

  it('cancel vs waitlist joins: no free place is ever left open while someone is waiting', async () => {
    // The runs rotate three timings so every interleaving is covered: all at once (joins win the lock),
    // joins 2 ms late (the cancel commits first and leaves a free place), and half on time, half late.
    const log = new RunLog('cancel vs joins: C=3 full, 0 waiting, 1 cancel + 9 joiners (N=10)');
    const timings = ['all at once', 'joins late', 'half late'] as const;
    const holders = members.slice(0, 3);
    const joiners = members.slice(3, 12);
    const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let run = 1; run <= RUNS; run += 1) {
      const { sessionId, bookingIds } = await fullClass(3, holders);
      const timing = timings[run % 3];

      const { responses, peak } = await race([
        () => cancel(bookingIds[0], holders[0]),
        ...joiners.map((member, index) => () => pause(joinDelay(timing, index)).then(() => joinWaitlist(sessionId, member))),
      ]);
      const [cancelResponse, ...joinResponses] = responses;
      const state = await seatState(sessionId);
      log.add(
        run,
        tally(responses),
        `${timing}: promoted=${state.promoted.length} still waiting=${state.waiting.length} booked_count=${state.bookedCount}/${state.capacity} peak clients=${peak}`,
      );

      expectNo5xx(responses);
      expect(cancelResponse.status).toBe(200);
      for (const key of Object.keys(tally(joinResponses))) expect(['201', '409 SESSION_NOT_FULL']).toContain(key);
      // The rule under test: while anyone waits, the class is full.
      if (state.waiting.length > 0) expect(state.bookedCount).toBe(state.capacity);
      // At most one place was freed, so at most one promotion.
      expect(state.promoted.length).toBeLessThanOrEqual(1);
      await expectIntegrity();
    }
    log.print();
  });

  it('double cancel: owner ×2 and admin ×3 at once → exactly 1 × 200 and at most one promotion', async () => {
    const log = new RunLog('double cancel: C=3 full, 1 waiting, same booking cancelled by owner×2 + admin×3 (N=5)');
    const holders = members.slice(0, 3);
    const waiter = members[3];

    for (let run = 1; run <= RUNS; run += 1) {
      const { sessionId, bookingIds } = await fullClass(3, holders);
      await insertWaitlistEntry(sessionId, waiter.id);
      mockSendMail.mockClear();

      const target = bookingIds[0];
      const callers = [holders[0], admin, holders[0], admin, admin];
      const { responses, peak } = await race(callers.map((caller) => () => cancel(target, caller)));
      const state = await seatState(sessionId);
      const emails = await sentEmails();
      log.add(
        run,
        tally(responses),
        `promoted=${state.promoted.length} E4=${recipientsOf('You got a place!', emails).length} E5=${recipientsOf('Booking cancelled', emails).length} booked_count=${state.bookedCount} peak clients=${peak}`,
      );

      expectNo5xx(responses);
      expect(tally(responses)).toEqual({ '200': 1, '409 BOOKING_ALREADY_CANCELLED': 4 });
      expect(state.promoted).toEqual([waiter.id]);
      expect(await confirmedCount(sessionId, waiter.id)).toBe(1);
      expect(state.bookedCount).toBe(3);
      expect(recipientsOf('You got a place!', emails)).toEqual([waiter.email]);
      expect(recipientsOf('Booking cancelled', emails)).toEqual([holders[0].email]);
      await expectIntegrity();
    }
    log.print();
  });

  it('order: 4 waiting, 3 simultaneous cancellations (+3 bookers) → the first 3 in created_at order are promoted once each', async () => {
    // 4 waiting (not 3) so the order is observable: the 4th in line must be the one left waiting.
    const log = new RunLog('order: C=3 full, 4 waiting, 3 cancels + 3 bookers (N=6)');
    const holders = members.slice(0, 3);
    const waiters = members.slice(3, 7); // joined in this order
    const bookers = members.slice(7, 10);

    for (let run = 1; run <= RUNS; run += 1) {
      const { sessionId, bookingIds } = await fullClass(3, holders);
      for (const [index, waiter] of waiters.entries()) await insertWaitlistEntry(sessionId, waiter.id, 40 - index * 10);
      mockSendMail.mockClear();

      const { responses, peak } = await race([
        ...bookingIds.map((bookingId, index) => () => cancel(bookingId, holders[index])),
        ...bookers.map((member) => () => book(sessionId, member)),
      ]);
      const state = await seatState(sessionId);
      const emails = await sentEmails();
      log.add(
        run,
        tally(responses),
        `promoted=${state.promoted.length} still waiting=${state.waiting.length} booked_count=${state.bookedCount} peak clients=${peak}`,
      );

      expectNo5xx(responses);
      expect(tally(responses)).toEqual({ '200': 3, '409 SESSION_FULL': 3 });
      expect(state.promoted.sort()).toEqual(waiters.slice(0, 3).map((waiter) => waiter.id).sort());
      expect(state.waiting).toEqual([waiters[3].id]);
      for (const waiter of waiters.slice(0, 3)) expect(await confirmedCount(sessionId, waiter.id)).toBe(1);
      expect(state.bookedCount).toBe(3);
      expect(recipientsOf('You got a place!', emails).sort()).toEqual(waiters.slice(0, 3).map((w) => w.email).sort());
      await expectIntegrity();
    }
    log.print();
  });
});
