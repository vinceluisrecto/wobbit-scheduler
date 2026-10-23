import { execSync } from 'node:child_process';
import { expect, request, test, type APIRequestContext, type Page } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  adminApi,
  book,
  clearInbox,
  createClass,
  expectNoEmail,
  inbox,
  joinWaitlist,
  linkIn,
  logIn,
  signUp,
  uniqueId,
  waitForEmail,
  type Member,
} from './helpers/qa';

// tasks/qa.md §E — real Mailpit at http://localhost:8025 (E1–E8). Each test uses fresh, unique
// recipients and clears just their mail first, so parallel workers never delete each other's mail.

// A second admin (created the only supported way, `yarn create-admin`), so "E8 to every admin" means something.
const SECOND_ADMIN = { name: 'QA Admin Two', email: 'qa-admin-two@studio.local', password: 'qa-admin-two-2026' };
const ADMINS = [ADMIN_EMAIL, SECOND_ADMIN.email];

test.beforeAll(() => {
  execSync('yarn -s create-admin', {
    env: { ...process.env, ADMIN_NAME: SECOND_ADMIN.name, ADMIN_EMAIL: SECOND_ADMIN.email, ADMIN_PASSWORD: SECOND_ADMIN.password },
    stdio: 'pipe',
  });
});

async function member(baseURL: string | undefined, timeZone?: string): Promise<{ api: APIRequestContext; member: Member }> {
  const api = await request.newContext({ baseURL });
  const created = await signUp(api, { timeZone });
  await clearInbox(created.email);
  return { api, member: created };
}

// Opens an email's link exactly as sent (APP_URL host) in a logged-in page and returns that page.
async function openLink(page: Page, url: URL): Promise<void> {
  const response = await page.goto(url.href);
  expect(response?.status(), `GET ${url.href}`).toBeLessThan(400);
}

test.describe('Emails (Mailpit)', () => {
  test('E1 on sign-up, with a working /sessions link', async ({ page }) => {
    const email = `qa-${uniqueId()}@example.com`;
    await clearInbox(email);
    await page.goto('/signup');
    await page.getByLabel('Name').fill('QA Signup');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('qa-password-123');
    await page.getByRole('button', { name: 'Create account' }).click();

    const welcome = await waitForEmail(email, 'Welcome to the studio');
    expect(welcome.html).toContain('<a href=');
    const link = linkIn(welcome);
    expect(link.pathname).toBe('/sessions');
    await openLink(page, link);
    await expect(page.getByRole('heading', { level: 1, name: 'Classes' })).toBeVisible();
  });

  test('E2 on booking, with a working /bookings/[id] link; times are in each recipient’s timezone', async ({ page, baseURL }) => {
    const admin = await adminApi(baseURL);
    const session = await createClass(admin, { title: `QA E2 ${uniqueId()}` });
    const newYork = await member(baseURL, 'America/New_York');
    const tokyo = await member(baseURL, 'Asia/Tokyo');
    const booking = await book(newYork.api, session.id);
    await book(tokyo.api, session.id);

    const e2 = await waitForEmail(newYork.member.email, `Booking confirmed: ${session.title}`);
    const e2Tokyo = await waitForEmail(tokyo.member.email, `Booking confirmed: ${session.title}`);
    const timeIn = (timeZone: string) =>
      new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(new Date(session.startsAt));
    expect(e2.text).toContain(timeIn('America/New_York'));
    expect(e2.text).toMatch(/E[SD]T/);
    expect(e2Tokyo.text).toContain(timeIn('Asia/Tokyo'));
    expect(e2Tokyo.text).toMatch(/GMT\+9/);
    console.log(`[QA] E2 time lines: NY="${e2.text.split('\n').find((l) => l.includes(session.title))}" Tokyo="${e2Tokyo.text.split('\n').find((l) => l.includes(session.title))}"`);

    const link = linkIn(e2);
    expect(link.pathname).toBe(`/bookings/${booking.id}`);
    await logIn(page.request, newYork.member.email, newYork.member.password);
    await openLink(page, link);
    await expect(page.getByRole('heading', { name: session.title })).toBeVisible();
    await expect(page.getByText('Confirmed', { exact: true })).toBeVisible();
  });

  test('E3 on joining a waitlist, with the correct position and a /account link', async ({ page, baseURL }) => {
    const admin = await adminApi(baseURL);
    const session = await createClass(admin, { title: `QA E3 ${uniqueId()}`, capacity: 1 });
    await book((await member(baseURL)).api, session.id);
    const first = await member(baseURL);
    const second = await member(baseURL);
    await joinWaitlist(first.api, session.id);
    await joinWaitlist(second.api, session.id);

    const e3First = await waitForEmail(first.member.email, "You're on the waitlist (#1)");
    const e3Second = await waitForEmail(second.member.email, "You're on the waitlist (#2)");
    expect(e3Second.text).toContain('You are #2 in line');
    expect(e3First.subject).toContain(session.title);

    const link = linkIn(e3Second);
    expect(link.pathname).toBe('/account');
    await logIn(page.request, second.member.email, second.member.password);
    await openLink(page, link);
    await expect(page.getByRole('article').filter({ hasText: session.title }).getByText("You're #2 in line")).toBeVisible();
  });

  test('E5 to the owner with "you" / "the studio" wording; E8 to every admin only for a paid booking', async ({ page, baseURL }) => {
    const admin = await adminApi(baseURL);
    const session = await createClass(admin, { title: `QA E5 ${uniqueId()}` });
    const self = await member(baseURL);
    const byStudio = await member(baseURL);
    const unpaid = await member(baseURL);
    const selfBooking = await book(self.api, session.id);
    const studioBooking = await book(byStudio.api, session.id);
    const unpaidBooking = await book(unpaid.api, session.id);
    await clearInbox(...ADMINS);
    await admin.patch(`/api/admin/bookings/${selfBooking.id}/payment`, { data: { paymentStatus: 'paid' } });

    await self.api.post(`/api/bookings/${selfBooking.id}/cancel`); // paid → E8
    await admin.post(`/api/bookings/${studioBooking.id}/cancel`); // unpaid → no E8
    await unpaid.api.post(`/api/bookings/${unpaidBooking.id}/cancel`); // unpaid → no E8

    const e5Self = await waitForEmail(self.member.email, `Booking cancelled: ${session.title}`);
    const e5Studio = await waitForEmail(byStudio.member.email, `Booking cancelled: ${session.title}`);
    expect(e5Self.text).toContain('You cancelled your booking for:');
    expect(e5Studio.text).toContain('The studio cancelled your booking for:');
    expect(linkIn(e5Self).pathname).toBe('/account');

    for (const address of ADMINS) {
      const e8 = await waitForEmail(address, `Refund due: ${self.member.name}, ${session.title}`);
      expect(e8.text).toContain(self.member.email);
      expect(linkIn(e8).pathname).toBe(`/admin/sessions/${session.id}`);
    }
    for (const address of ADMINS) {
      await expectNoEmail(address, `Refund due: ${byStudio.member.name}`, 0);
      await expectNoEmail(address, `Refund due: ${unpaid.member.name}`, 0);
    }

    const e8 = await waitForEmail(ADMIN_EMAIL, `Refund due: ${self.member.name}`);
    await logIn(page.request, ADMIN_EMAIL, ADMIN_PASSWORD);
    await openLink(page, linkIn(e8));
    await expect(page.getByRole('heading', { name: session.title })).toBeVisible();
    await expect(page.getByText('Refund due').first()).toBeVisible();
  });

  test('E4 only to the promoted member, by cancellation and by a capacity increase', async ({ page, baseURL }) => {
    const admin = await adminApi(baseURL);
    const session = await createClass(admin, { title: `QA E4 ${uniqueId()}`, capacity: 1 });
    const owner = await member(baseURL);
    const first = await member(baseURL);
    const second = await member(baseURL);
    const ownerBooking = await book(owner.api, session.id);
    await joinWaitlist(first.api, session.id);
    await joinWaitlist(second.api, session.id);

    await owner.api.post(`/api/bookings/${ownerBooking.id}/cancel`);
    const e4 = await waitForEmail(first.member.email, `You got a place! ${session.title}`);
    await expectNoEmail(second.member.email, 'You got a place!');
    await expectNoEmail(owner.member.email, 'You got a place!', 0);

    await admin.patch(`/api/admin/sessions/${session.id}`, { data: { capacity: 2 } });
    await waitForEmail(second.member.email, `You got a place! ${session.title}`);
    expect((await inbox(first.member.email)).filter((m) => m.subject.startsWith('You got a place!'))).toHaveLength(1);

    const link = linkIn(e4);
    expect(link.pathname).toMatch(/^\/bookings\/[0-9a-f-]{36}$/);
    await logIn(page.request, first.member.email, first.member.password);
    await openLink(page, link);
    await expect(page.getByRole('heading', { name: session.title })).toBeVisible();
  });

  test('E6 to confirmed members only when title/time change; none for price- or capacity-only changes', async ({ baseURL }) => {
    const admin = await adminApi(baseURL);
    const session = await createClass(admin, { title: `QA E6 ${uniqueId()}`, capacity: 3 });
    const a = await member(baseURL);
    const b = await member(baseURL);
    const cancelled = await member(baseURL);
    const waiting = await member(baseURL);
    await book(a.api, session.id);
    await book(b.api, session.id);
    const toCancel = await book(cancelled.api, session.id);
    await cancelled.api.post(`/api/bookings/${toCancel.id}/cancel`);
    await admin.patch(`/api/admin/sessions/${session.id}`, { data: { capacity: 2 } }); // full → waitlist possible
    await joinWaitlist(waiting.api, session.id);
    const e6 = (address: string) => inbox(address).then((all) => all.filter((m) => m.subject.startsWith('Class details changed')));

    const newTitle = `${session.title} (moved)`;
    await admin.patch(`/api/admin/sessions/${session.id}`, { data: { title: newTitle } });
    await waitForEmail(a.member.email, `Class details changed: ${newTitle}`);
    await waitForEmail(b.member.email, `Class details changed: ${newTitle}`);
    const later = new Date(Date.parse(session.startsAt) + 3_600_000).toISOString();
    await admin.patch(`/api/admin/sessions/${session.id}`, { data: { startsAt: later } });
    await expect.poll(async () => (await e6(a.member.email)).length).toBe(2);

    await admin.patch(`/api/admin/sessions/${session.id}`, { data: { priceCents: 2500 } });
    await admin.patch(`/api/admin/sessions/${session.id}`, { data: { capacity: 3 } }); // also promotes `waiting`
    await waitForEmail(waiting.member.email, 'You got a place!');
    await new Promise((resolve) => setTimeout(resolve, 2_000));

    expect((await e6(a.member.email)).length).toBe(2);
    expect((await e6(b.member.email)).length).toBe(2);
    expect(await e6(cancelled.member.email)).toEqual([]);
    expect(await e6(waiting.member.email)).toEqual([]);
    const timeLine = (await e6(a.member.email)).at(-1)!.text;
    const newTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' }).format(new Date(later));
    expect(timeLine).toContain(newTime);
    expect(linkIn((await e6(a.member.email))[0]).pathname).toMatch(/^\/bookings\//);
  });

  test('E7 for a known email (link opens the reset page) and nothing for an unknown one', async ({ page, baseURL }) => {
    const known = await member(baseURL);
    const unknown = `qa-nobody-${uniqueId()}@example.com`;
    await clearInbox(unknown);
    const api = await request.newContext({ baseURL });
    expect((await api.post('/api/auth/forgot-password', { data: { email: known.member.email } })).status()).toBe(204);
    expect((await api.post('/api/auth/forgot-password', { data: { email: unknown } })).status()).toBe(204);

    const e7 = await waitForEmail(known.member.email, 'Reset your password');
    await expectNoEmail(unknown, '');
    const link = linkIn(e7);
    expect(link.pathname).toBe('/reset-password');
    expect(link.searchParams.get('token')).toMatch(/.{20,}/);
    await openLink(page, link);
    await expect(page.getByRole('heading', { name: 'Set a new password' })).toBeVisible();
  });
});
