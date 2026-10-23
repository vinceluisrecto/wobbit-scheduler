// Shared setup for QA's e2e specs (tasks/qa.md §C, §E, §F).
// Every test builds its own members and classes through the API, so specs stay independent
// under `fullyParallel` and never depend on (or change) the seeded demo data they don't own.
import { expect, request, type APIRequestContext, type Page } from '@playwright/test';
import type { AdminSessionSummary } from '@/types/admin';
import type { BookingWithSession } from '@/types/bookings';
import type { WaitlistEntryWithSession } from '@/types/waitlist';

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@studio.local';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'change-me-admin-2026';
export const MEMBER_PASSWORD = 'qa-password-123';

const MAILPIT_API = 'http://localhost:8025/api/v1';

export interface Member {
  id: string;
  name: string;
  email: string;
  password: string;
}

// Unique per call, so parallel tests never collide on emails or class titles.
export function uniqueId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

async function ok<T>(response: Awaited<ReturnType<APIRequestContext['get']>>, label: string): Promise<T> {
  expect(response.ok(), `${label}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? (undefined as T) : ((await response.json()) as T);
}

// Signs up through the API. The request context (page.request / context.request) keeps the cookie,
// so the browser behind it is logged in as this member.
export async function signUp(
  api: APIRequestContext,
  options: { name?: string; timeZone?: string } = {},
): Promise<Member> {
  const id = uniqueId();
  const name = options.name ?? `QA Member ${id}`;
  const email = `qa-${id}@example.com`;
  const { user } = await ok<{ user: { id: string } }>(
    await api.post('/api/auth/signup', {
      data: { name, email, password: MEMBER_PASSWORD, timeZone: options.timeZone ?? 'Asia/Manila' },
    }),
    'signup',
  );
  return { id: user.id, name, email, password: MEMBER_PASSWORD };
}

export async function logIn(api: APIRequestContext, email: string, password: string): Promise<void> {
  await ok(await api.post('/api/auth/login', { data: { email, password } }), `login ${email}`);
}

// A separate, logged-in admin API context (not tied to any browser page).
export async function adminApi(baseURL: string | undefined): Promise<APIRequestContext> {
  const api = await request.newContext({ baseURL });
  await logIn(api, ADMIN_EMAIL, ADMIN_PASSWORD);
  return api;
}

// A fresh, logged-in member API context (not tied to any browser page).
export async function memberApi(baseURL: string | undefined): Promise<{ api: APIRequestContext; member: Member }> {
  const api = await request.newContext({ baseURL });
  return { api, member: await signUp(api) };
}

interface ClassOptions {
  title?: string;
  instructor?: string;
  capacity?: number;
  priceCents?: number;
  startsInHours?: number;
}

export async function createClass(admin: APIRequestContext, options: ClassOptions = {}): Promise<AdminSessionSummary> {
  const { session } = await ok<{ session: AdminSessionSummary }>(
    await admin.post('/api/admin/sessions', {
      data: {
        title: options.title ?? `QA Class ${uniqueId()}`,
        instructor: options.instructor ?? 'QA Instructor',
        startsAt: new Date(Date.now() + (options.startsInHours ?? 48) * 3_600_000).toISOString(),
        durationMinutes: 60,
        capacity: options.capacity ?? 10,
        priceCents: options.priceCents ?? 1500,
      },
    }),
    'create class',
  );
  return session;
}

export async function book(api: APIRequestContext, sessionId: string): Promise<BookingWithSession> {
  const { booking } = await ok<{ booking: BookingWithSession }>(
    await api.post(`/api/sessions/${sessionId}/bookings`),
    'book',
  );
  return booking;
}

export async function joinWaitlist(api: APIRequestContext, sessionId: string): Promise<WaitlistEntryWithSession> {
  const { waitlistEntry } = await ok<{ waitlistEntry: WaitlistEntryWithSession }>(
    await api.post(`/api/sessions/${sessionId}/waitlist`),
    'join waitlist',
  );
  return waitlistEntry;
}

export async function getAdminSession(admin: APIRequestContext, sessionId: string) {
  return ok<{
    session: AdminSessionSummary;
    bookings: BookingWithSession[];
    waitlist: WaitlistEntryWithSession[];
  }>(await admin.get(`/api/admin/sessions/${sessionId}`), 'admin session detail');
}

export async function fillLogin(page: Page, email: string, password: string): Promise<void> {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
}

// ---- Mailpit (real inbox at http://localhost:8025) ----

export interface Email {
  id: string;
  subject: string;
  to: string[];
  text: string;
  html: string;
}

interface MailpitSummary {
  ID: string;
  Subject: string;
  To: { Address: string }[];
}

async function searchMailpit(address: string): Promise<MailpitSummary[]> {
  const query = encodeURIComponent(`to:"${address}"`);
  const response = await fetch(`${MAILPIT_API}/search?query=${query}&limit=200`);
  expect(response.ok, `Mailpit search for ${address}`).toBe(true);
  const body = (await response.json()) as { messages: MailpitSummary[] };
  return body.messages;
}

// Clears one recipient's mail. A global DELETE would wipe mail that parallel tests are waiting for.
export async function clearInbox(...addresses: string[]): Promise<void> {
  for (const address of addresses) {
    const ids = (await searchMailpit(address)).map((message) => message.ID);
    if (ids.length === 0) continue;
    await fetch(`${MAILPIT_API}/messages`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDs: ids }),
    });
  }
}

async function readEmail(summary: MailpitSummary): Promise<Email> {
  const response = await fetch(`${MAILPIT_API}/message/${summary.ID}`);
  const message = (await response.json()) as { Text: string; HTML: string };
  return {
    id: summary.ID,
    subject: summary.Subject,
    to: summary.To.map((to) => to.Address),
    text: message.Text,
    html: message.HTML,
  };
}

// Every email this address has received, oldest first.
export async function inbox(address: string): Promise<Email[]> {
  const summaries = await searchMailpit(address);
  return Promise.all(summaries.reverse().map(readEmail));
}

// Emails are sent after the transaction commits and aren't awaited, so poll until one arrives.
export async function waitForEmail(address: string, subjectStart: string, timeoutMs = 10_000): Promise<Email> {
  let found: Email | undefined;
  await expect
    .poll(
      async () => {
        found = (await inbox(address)).find((email) => email.subject.startsWith(subjectStart));
        return found !== undefined;
      },
      { message: `waiting for "${subjectStart}" to ${address}`, timeout: timeoutMs },
    )
    .toBe(true);
  return found!;
}

// "No email" can only be shown by waiting a moment and finding none.
export async function expectNoEmail(address: string, subjectStart: string, waitMs = 2_000): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  const subjects = (await inbox(address)).map((email) => email.subject);
  expect(subjects.filter((subject) => subject.startsWith(subjectStart))).toEqual([]);
}

// The action link in an email body ("View your booking: http://...").
export function linkIn(email: Email): URL {
  const match = email.text.match(/https?:\/\/\S+/);
  expect(match, `a link in "${email.subject}"`).not.toBeNull();
  return new URL(match![0]);
}
