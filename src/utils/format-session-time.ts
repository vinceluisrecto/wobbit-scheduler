// Times are shown in the viewer's device timezone (D6): no `timeZone` option anywhere.

const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const dateFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Today", "Tomorrow", or a short date like "Fri, Oct 25". */
export function formatSessionDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (isSameLocalDay(date, now)) return 'Today';

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (isSameLocalDay(date, tomorrow)) return 'Tomorrow';

  return dateFormatter.format(date);
}

/** The clock time, e.g. "6:30 PM". */
export function formatSessionTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** Day and time together, e.g. "Today · 6:30 PM". */
export function formatSessionDateTime(iso: string, now: Date = new Date()): string {
  return `${formatSessionDay(iso, now)} · ${formatSessionTime(iso)}`;
}
