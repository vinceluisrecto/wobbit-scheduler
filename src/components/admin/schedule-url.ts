// The header (search, "+ New class") and the schedule share state through the URL, not a store:
// ?q= filters the schedule, ?new=1 and ?edit=<id> open the class form, ?scope=past shows past classes,
// and ?saved=<id> highlights a class saved from a deep-link form page.

export const SCHEDULE_PATH = '/admin/sessions';

export type ScheduleParam = 'q' | 'new' | 'edit' | 'scope' | 'saved';

/** Updates the schedule's query string in place. Next keeps useSearchParams in sync with replaceState. */
export function replaceScheduleParams(changes: Partial<Record<ScheduleParam, string | null>>): void {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const query = params.toString();
  window.history.replaceState(null, '', query ? `${window.location.pathname}?${query}` : window.location.pathname);
}
