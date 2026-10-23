// Fixed ids and logins from `yarn seed` (src/db/seed.ts), for QA and e2e. Dev and test only.

export const SEED_MEMBER_PASSWORD = 'studio-demo-2026';

function seedId(prefix: string, n: number): string {
  return `${prefix}0000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
}

export const SEED_MEMBERS = [
  { key: 'maya', name: 'Maya Santos', email: 'maya@example.com' },
  { key: 'leo', name: 'Leo Cruz', email: 'leo@example.com' },
  { key: 'ava', name: 'Ava Reyes', email: 'ava@example.com' },
  { key: 'noah', name: 'Noah Lim', email: 'noah@example.com' },
  { key: 'zoe', name: 'Zoe Tan', email: 'zoe@example.com' },
  { key: 'kai', name: 'Kai Mendoza', email: 'kai@example.com' },
  { key: 'mia', name: 'Mia Garcia', email: 'mia@example.com' },
  { key: 'sam', name: 'Sam Torres', email: 'sam@example.com' },
  { key: 'ivy', name: 'Ivy Bautista', email: 'ivy@example.com' },
  { key: 'ben', name: 'Ben Aquino', email: 'ben@example.com' },
  { key: 'lily', name: 'Lily Navarro', email: 'lily@example.com' },
  { key: 'omar', name: 'Omar Villanueva', email: 'omar@example.com' },
  { key: 'ruby', name: 'Ruby Castillo', email: 'ruby@example.com' },
  { key: 'theo', name: 'Theo Ramos', email: 'theo@example.com' },
  { key: 'nina', name: 'Nina Flores', email: 'nina@example.com' },
].map((member, index) => ({ ...member, id: seedId('1', index + 1) }));

export type SeedMemberKey = (typeof SEED_MEMBERS)[number]['key'];

export const SEED_SESSION_IDS = {
  open: seedId('2', 1), // plenty of spots
  oneSpot: seedId('2', 2), // exactly 1 spot left
  fillingFast: seedId('2', 3), // 2 spots left
  fullWithWaitlist: seedId('2', 4), // full, 2 waiting
  past: seedId('2', 5), // already happened, with bookings
  today: seedId('2', 6), // later today
  empty: seedId('2', 7), // 0 bookings, for the admin delete demo
} as const;

// Bookings worth pointing at in tests and demos.
export const SEED_BOOKING_IDS = {
  mayaUpcomingPaid: seedId('3', 1),
  mayaUpcomingUnpaid: seedId('3', 2),
  mayaPastPaid: seedId('3', 3),
  mayaCancelled: seedId('3', 4),
  refundDue: seedId('3', 5), // cancelled by the studio after Leo paid
} as const;

export const SEED_WAITLIST_IDS = {
  lilyFirstInLine: seedId('4', 1),
  mayaSecondInLine: seedId('4', 2),
} as const;

export { seedId };
