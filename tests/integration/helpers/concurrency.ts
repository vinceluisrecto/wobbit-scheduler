import type { Server } from 'node:http';
import type { Response } from 'supertest';
import { createApp } from '../../../src/create-app';
import { pool } from '../../../src/db/client';

// QA concurrency runs (tasks/qa.md §A): every case repeats RUNS times against the real test database.
export const RUNS = 20;

// node-postgres defaults to 10 clients. N above this queues inside the app and proves less (§10).
export const POOL_SIZE = pool.options.max ?? 10;

// One listening server, so parallel supertest requests really overlap on the same pool.
export function startServer(): Server {
  return createApp().listen(0);
}

export function stopServer(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

// Runs the requests at once and reports the peak number of pool clients checked out together,
// as evidence that the transactions really overlapped (a peak of 1 would mean they ran one by one).
export async function race<T>(requests: (() => PromiseLike<T>)[]): Promise<{ responses: T[]; peak: number }> {
  let active = 0;
  let peak = 0;
  const onAcquire = () => {
    active += 1;
    peak = Math.max(peak, active);
  };
  const onRelease = () => {
    active -= 1;
  };
  pool.on('acquire', onAcquire);
  pool.on('release', onRelease);
  try {
    const responses = await Promise.all(requests.map((send) => send()));
    return { responses, peak };
  } finally {
    pool.off('acquire', onAcquire);
    pool.off('release', onRelease);
  }
}

// "201", "409 SESSION_FULL", ... so a run's outcomes can be counted and printed.
export function outcome(response: Response): string {
  const code = response.body?.error?.code;
  return code ? `${response.status} ${code}` : String(response.status);
}

export function tally(responses: Response[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const response of responses) {
    const key = outcome(response);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function expectNo5xx(responses: Response[]): void {
  expect(responses.filter((response) => response.status >= 500).map(outcome)).toEqual([]);
}

// The four invariants checked after every run (tasks/qa.md §A), across every class in the database.
export async function expectIntegrity(): Promise<void> {
  const seats = await pool.query<{ id: string; booked_count: number; capacity: number; confirmed: number }>(
    `SELECT s.id, s.booked_count, s.capacity,
            (SELECT count(*)::int FROM bookings b WHERE b.session_id = s.id AND b.status = 'confirmed') AS confirmed
       FROM sessions s`,
  );
  for (const row of seats.rows) {
    expect({ id: row.id, bookedCount: row.booked_count }).toEqual({ id: row.id, bookedCount: row.confirmed });
    expect(row.booked_count).toBeLessThanOrEqual(row.capacity);
  }

  // Every promoted entry points at a confirmed booking for the same member and class.
  const badPromotions = await pool.query(
    `SELECT w.id FROM waitlist_entries w
       LEFT JOIN bookings b ON b.id = w.booking_id
      WHERE w.status = 'promoted'
        AND (b.id IS NULL OR b.status <> 'confirmed' OR b.user_id <> w.user_id OR b.session_id <> w.session_id)`,
  );
  expect(badPromotions.rows).toEqual([]);

  // Nobody is both booked and waiting for the same class.
  const bookedAndWaiting = await pool.query(
    `SELECT w.id FROM waitlist_entries w
       JOIN bookings b ON b.session_id = w.session_id AND b.user_id = w.user_id AND b.status = 'confirmed'
      WHERE w.status = 'waiting'`,
  );
  expect(bookedAndWaiting.rows).toEqual([]);
}

// Collects per-run outcome counts and prints one table per case, for the QA report.
export class RunLog {
  private readonly lines: string[] = [];

  constructor(private readonly title: string) {}

  add(run: number, counts: Record<string, number>, extra = ''): void {
    const outcomes = Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => `${key}×${count}`)
      .join(', ');
    this.lines.push(`  run ${String(run).padStart(2)}: ${outcomes}${extra ? ` | ${extra}` : ''}`);
  }

  print(): void {
    console.log(`[concurrency-real-DB] ${this.title} (pool=${POOL_SIZE})\n${this.lines.join('\n')}`);
  }
}
