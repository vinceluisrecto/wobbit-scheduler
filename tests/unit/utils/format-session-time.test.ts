import { describe, expect, it } from 'vitest';
import { formatSessionDateTime, formatSessionDay, formatSessionTime } from '@/utils/format-session-time';

// Local-time dates, so these tests pass in any device timezone (no timeZone option is used).
const now = new Date(2026, 9, 23, 9, 0); // Fri Oct 23 2026, 9:00 AM local

describe('formatSessionDay', () => {
  it('says "Today" for a class later today', () => {
    expect(formatSessionDay(new Date(2026, 9, 23, 18, 30).toISOString(), now)).toBe('Today');
  });

  it('says "Tomorrow" for a class tomorrow, even just after midnight', () => {
    expect(formatSessionDay(new Date(2026, 9, 24, 0, 15).toISOString(), now)).toBe('Tomorrow');
  });

  it('uses a short date further out', () => {
    expect(formatSessionDay(new Date(2026, 9, 27, 7, 0).toISOString(), now)).toBe('Tue, Oct 27');
  });

  it('handles the end of a month', () => {
    const lastDay = new Date(2026, 9, 31, 22, 0);
    expect(formatSessionDay(new Date(2026, 10, 1, 8, 0).toISOString(), lastDay)).toBe('Tomorrow');
  });
});

describe('formatSessionTime', () => {
  it('shows the clock time in the device timezone', () => {
    const iso = new Date(2026, 9, 23, 18, 30).toISOString(); // stored as UTC
    expect(formatSessionTime(iso)).toBe('6:30 PM');
  });

  it('converts a UTC timestamp to local time', () => {
    const utc = '2026-10-23T10:00:00.000Z';
    const local = new Date(utc);
    const hour12 = local.getHours() % 12 || 12;
    expect(formatSessionTime(utc)).toBe(
      `${hour12}:${String(local.getMinutes()).padStart(2, '0')} ${local.getHours() < 12 ? 'AM' : 'PM'}`,
    );
  });
});

describe('formatSessionDateTime', () => {
  it('joins the day and the time', () => {
    expect(formatSessionDateTime(new Date(2026, 9, 23, 18, 30).toISOString(), now)).toBe('Today · 6:30 PM');
  });
});
