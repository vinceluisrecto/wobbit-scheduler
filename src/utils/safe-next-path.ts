/**
 * The `?next=` target after logging in. Only same-site paths are allowed (no "//evil.com" or
 * "https://…"), so the redirect can't be used to send people to another site.
 */
export function safeNextPath(next: string | null | undefined, fallback = '/sessions'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
