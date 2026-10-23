import type { AdminSessionDetailResponse, AdminSessionSummary } from '@/types/admin';
import { formatSessionDay } from '@/utils/format-session-time';

export interface DayGroup {
  /** "Today", "Tomorrow", or a short date like "Fri, Oct 25" (device timezone). */
  label: string;
  sessions: AdminSessionSummary[];
}

/**
 * Groups classes by local day, keeping the API order (upcoming: soonest first, past: latest first).
 * For upcoming classes "Today" is always the first group, even when it's empty, so it stays pinned.
 */
export function groupByDay(sessions: AdminSessionSummary[], pinToday: boolean, now: Date = new Date()): DayGroup[] {
  const groups: DayGroup[] = pinToday ? [{ label: 'Today', sessions: [] }] : [];
  for (const session of sessions) {
    const label = formatSessionDay(session.startsAt, now);
    const group = groups.find((item) => item.label === label);
    if (group) group.sessions.push(session);
    else groups.push({ label, sessions: [session] });
  }
  return groups;
}

/**
 * Instant client-side search: title, instructor, or the name/email of anyone in a roster that's
 * already loaded (rows that were expanded at least once).
 */
export function matchesSearch(
  session: AdminSessionSummary,
  detail: AdminSessionDetailResponse | undefined,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const includes = (text: string) => text.toLowerCase().includes(needle);
  if (includes(session.title) || includes(session.instructor)) return true;
  if (!detail) return false;
  return [...detail.bookings, ...detail.waitlist].some((person) => includes(person.name) || includes(person.email));
}
