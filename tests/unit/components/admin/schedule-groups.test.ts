import { describe, expect, it } from 'vitest';
import { groupByDay, matchesSearch } from '@/components/admin';
import { atLocal, makeBooking, makeDetail, makeSession, makeWaitlistEntry, NOW } from './fixtures';

describe('groupByDay', () => {
  const today = makeSession({ id: 'a', startsAt: atLocal(0, 18) });
  const tomorrowEarly = makeSession({ id: 'b', startsAt: atLocal(1, 7) });
  const tomorrowLate = makeSession({ id: 'c', startsAt: atLocal(1, 19) });

  it('keeps the API order and groups by local day', () => {
    const groups = groupByDay([today, tomorrowEarly, tomorrowLate], true, NOW);

    expect(groups.map((group) => group.label)).toEqual(['Today', 'Tomorrow']);
    expect(groups[1].sessions.map((session) => session.id)).toEqual(['b', 'c']);
  });

  it('pins an empty Today group when asked', () => {
    expect(groupByDay([tomorrowEarly], true, NOW).map((group) => group.label)).toEqual(['Today', 'Tomorrow']);
    expect(groupByDay([tomorrowEarly], false, NOW).map((group) => group.label)).toEqual(['Tomorrow']);
  });
});

describe('matchesSearch', () => {
  const session = makeSession({ title: 'Evening Flow', instructor: 'Ana Reyes' });
  const detail = makeDetail({
    bookings: [makeBooking({ name: 'Maya Santos', email: 'maya@example.com' })],
    waitlist: [makeWaitlistEntry({ name: 'Lily Navarro', email: 'lily@example.com' })],
  });

  it('matches everything for an empty query', () => {
    expect(matchesSearch(session, undefined, '  ')).toBe(true);
  });

  it('matches title and instructor, ignoring case', () => {
    expect(matchesSearch(session, undefined, 'evening')).toBe(true);
    expect(matchesSearch(session, undefined, 'REYES')).toBe(true);
    expect(matchesSearch(session, undefined, 'pilates')).toBe(false);
  });

  it('matches member names and emails only in loaded rosters', () => {
    expect(matchesSearch(session, detail, 'maya s')).toBe(true);
    expect(matchesSearch(session, detail, 'lily@')).toBe(true);
    expect(matchesSearch(session, undefined, 'maya')).toBe(false);
  });
});
