import type { PoolClient } from 'pg';
import { env } from '../config/env';
import {
  SEED_BOOKING_IDS,
  SEED_MEMBERS,
  SEED_MEMBER_PASSWORD,
  SEED_SESSION_IDS,
  SEED_WAITLIST_IDS,
  seedId,
  type SeedMemberKey,
} from '../constants/seed';
import { hashPassword } from '../utils/password';
import { pool } from './client';
import { createAdmin } from './create-admin';

// D2: wipes the database and inserts fixed demo data, with times relative to now().
// Dev and test only. Re-run before demos and e2e runs, since the times drift.

interface SeedSession {
  id: string;
  title: string;
  instructor: string;
  startsIn: string; // interval from the current hour, e.g. '2 days 9 hours'
  durationMinutes: number;
  capacity: number;
  priceCents: number;
}

interface SeedBooking {
  id?: string;
  session: string;
  member: SeedMemberKey;
  paid?: boolean;
  cancelledBy?: 'member' | 'admin';
}

const sessions: SeedSession[] = [
  { id: SEED_SESSION_IDS.open, title: 'Morning Flow Yoga', instructor: 'Ana Rivera', startsIn: '2 days 1 hour', durationMinutes: 60, capacity: 20, priceCents: 1500 },
  { id: SEED_SESSION_IDS.oneSpot, title: 'Power Pilates', instructor: 'Marco Diaz', startsIn: '1 day 4 hours', durationMinutes: 50, capacity: 8, priceCents: 1800 },
  { id: SEED_SESSION_IDS.fillingFast, title: 'HIIT Burn', instructor: 'Jess Park', startsIn: '3 days 2 hours', durationMinutes: 45, capacity: 12, priceCents: 1200 },
  { id: SEED_SESSION_IDS.fullWithWaitlist, title: 'Sunset Vinyasa', instructor: 'Ana Rivera', startsIn: '1 day 8 hours', durationMinutes: 75, capacity: 6, priceCents: 2000 },
  { id: SEED_SESSION_IDS.past, title: 'Core Strength', instructor: 'Marco Diaz', startsIn: '-2 days', durationMinutes: 60, capacity: 10, priceCents: 1500 },
  { id: SEED_SESSION_IDS.today, title: 'Lunchtime Stretch', instructor: 'Jess Park', startsIn: '2 hours', durationMinutes: 30, capacity: 15, priceCents: 1000 },
  { id: SEED_SESSION_IDS.empty, title: 'Breathwork Basics', instructor: 'Lena Cho', startsIn: '5 days 3 hours', durationMinutes: 40, capacity: 10, priceCents: 0 },
];

const S = SEED_SESSION_IDS;
const bookings: SeedBooking[] = [
  // Maya: upcoming paid + unpaid, past paid, one she cancelled herself.
  { id: SEED_BOOKING_IDS.mayaUpcomingPaid, session: S.open, member: 'maya', paid: true },
  { id: SEED_BOOKING_IDS.mayaUpcomingUnpaid, session: S.fillingFast, member: 'maya' },
  { id: SEED_BOOKING_IDS.mayaPastPaid, session: S.past, member: 'maya', paid: true },
  { id: SEED_BOOKING_IDS.mayaCancelled, session: S.today, member: 'maya', cancelledBy: 'member' },
  // Cancelled by the studio after paying: shows "Refund due".
  { id: SEED_BOOKING_IDS.refundDue, session: S.oneSpot, member: 'leo', paid: true, cancelledBy: 'admin' },

  { session: S.open, member: 'ava' },
  { session: S.open, member: 'noah', paid: true },

  ...(['ava', 'noah', 'zoe', 'kai', 'mia', 'sam', 'ivy'] as const).map((member, i) => ({
    session: S.oneSpot, member, paid: i % 2 === 0,
  })),
  ...(['leo', 'ava', 'noah', 'zoe', 'kai', 'mia', 'sam', 'ivy', 'ben'] as const).map((member, i) => ({
    session: S.fillingFast, member, paid: i % 3 === 0,
  })),
  ...(['leo', 'ava', 'noah', 'zoe', 'kai', 'mia'] as const).map((member, i) => ({
    session: S.fullWithWaitlist, member, paid: i < 4,
  })),
  ...(['leo', 'ava', 'omar', 'ruby'] as const).map((member, i) => ({
    session: S.past, member, paid: i !== 2,
  })),
  ...(['noah', 'zoe', 'theo', 'nina'] as const).map((member) => ({ session: S.today, member })),
];

const waitlist = [
  { id: SEED_WAITLIST_IDS.lilyFirstInLine, session: S.fullWithWaitlist, member: 'lily', joinedAgo: '2 hours' },
  { id: SEED_WAITLIST_IDS.mayaSecondInLine, session: S.fullWithWaitlist, member: 'maya', joinedAgo: '1 hour' },
] as const;

function memberId(key: SeedMemberKey): string {
  return SEED_MEMBERS.find((member) => member.key === key)!.id;
}

async function insertData(client: PoolClient) {
  await client.query(
    'TRUNCATE waitlist_entries, bookings, sessions, password_reset_tokens, user_sessions, users',
  );

  const passwordHash = await hashPassword(SEED_MEMBER_PASSWORD);
  for (const member of SEED_MEMBERS) {
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, time_zone) VALUES ($1, $2, $3, $4, 'Asia/Manila')`,
      [member.id, member.name, member.email, passwordHash],
    );
  }

  for (const s of sessions) {
    await client.query(
      `INSERT INTO sessions (id, title, instructor, starts_at, duration_minutes, capacity, price_cents)
       VALUES ($1, $2, $3, date_trunc('hour', now()) + $4::interval, $5, $6, $7)`,
      [s.id, s.title, s.instructor, s.startsIn, s.durationMinutes, s.capacity, s.priceCents],
    );
  }

  for (const [index, b] of bookings.entries()) {
    const cancelled = b.cancelledBy !== undefined;
    await client.query(
      `INSERT INTO bookings (id, session_id, user_id, status, cancelled_at, cancelled_by, payment_status, paid_at, created_at)
       VALUES ($1, $2, $3, $4,
               CASE WHEN $5 THEN now() - interval '1 hour' END, $6,
               $7, CASE WHEN $8 THEN now() - interval '1 day' END,
               now() - interval '3 days' + $9 * interval '1 minute')`,
      [
        b.id ?? seedId('3', 100 + index),
        b.session,
        memberId(b.member),
        cancelled ? 'cancelled' : 'confirmed',
        cancelled,
        b.cancelledBy ?? null,
        b.paid ? 'paid' : 'unpaid',
        b.paid === true,
        index,
      ],
    );
  }

  for (const w of waitlist) {
    await client.query(
      `INSERT INTO waitlist_entries (id, session_id, user_id, created_at) VALUES ($1, $2, $3, now() - $4::interval)`,
      [w.id, w.session, memberId(w.member), w.joinedAgo],
    );
  }

  // booked_count always equals the number of confirmed bookings.
  await client.query(
    `UPDATE sessions s SET booked_count =
       (SELECT count(*) FROM bookings b WHERE b.session_id = s.id AND b.status = 'confirmed')`,
  );

  return createAdmin(env.admin, client);
}

async function seed() {
  if (env.isProduction) throw new Error('Refusing to seed a production database');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const admin = await insertData(client);
    await client.query('COMMIT');

    console.log(`Seeded ${SEED_MEMBERS.length} members, ${sessions.length} classes, ${bookings.length} bookings.`);
    console.log(`Demo members (e.g. ${SEED_MEMBERS[0].email}) share the dev-only password: ${SEED_MEMBER_PASSWORD}`);
    console.log(`Demo admin: ${admin.email} (password from ADMIN_PASSWORD)`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
