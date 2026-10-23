import { expect, request, test, type Locator, type Page } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  adminApi,
  book,
  createClass,
  fillLogin,
  getAdminSession,
  joinWaitlist,
  logIn,
  memberApi,
  signUp,
  uniqueId,
} from './helpers/qa';

// tasks/qa.md §C admin.spec.ts — frontend-admin + backend-admin. Also §F "admin click counts".

function row(page: Page, title: string): Locator {
  return page.getByRole('listitem').filter({ has: page.getByText(title, { exact: true }) });
}

function rowToggle(page: Page, title: string): Locator {
  return row(page, title).locator('button[aria-expanded]');
}

async function openSchedule(page: Page): Promise<void> {
  await logIn(page.request, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto('/admin');
  await expect(page).toHaveURL('/admin/sessions');
  await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
}

// A class with two unpaid members booked, for the roster tests.
async function classWithTwoBookings(baseURL: string | undefined, prefix: string) {
  const admin = await adminApi(baseURL);
  const session = await createClass(admin, { title: `${prefix} ${uniqueId()}`, capacity: 5 });
  const first = await memberApi(baseURL);
  const second = await memberApi(baseURL);
  await book(first.api, session.id);
  await book(second.api, session.id);
  return { admin, session, first: first.member, second: second.member };
}

test.describe('Admin', () => {
  test('guard: logged out → admin login; a member account is refused', async ({ page, browser, baseURL }) => {
    await page.goto('/admin/sessions');
    await expect(page).toHaveURL(/\/admin\/login/);

    const { member } = await memberApi(baseURL);
    await fillLogin(page, member.email, member.password);
    await expect(page.getByText("This account isn't an admin.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);

    // A member who is already logged in and opens /admin directly is sent away too.
    const memberContext = await browser.newContext({ baseURL });
    const memberPage = await memberContext.newPage();
    await signUp(memberContext.request);
    await memberPage.goto('/admin/sessions');
    await expect(memberPage).toHaveURL(/\/admin\/login\?reason=forbidden/);
    await expect(memberPage.getByRole('heading', { name: 'Schedule' })).toHaveCount(0);
    await memberContext.close();
  });

  test('Today is pinned first', async ({ page }) => {
    await openSchedule(page);
    const groups = page.getByRole('tabpanel').getByRole('heading', { level: 2 });
    await expect(groups.first()).toHaveText('Today');
  });

  test('expand a row → mark paid → the counts update without leaving the page (≤ 2 clicks from /admin)', async ({
    page,
    baseURL,
  }) => {
    const { session, first } = await classWithTwoBookings(baseURL, 'QA Paid');
    await openSchedule(page);
    const scheduleUrl = page.url();
    await expect(row(page, session.title).getByText('0 paid')).toBeVisible();
    await expect(row(page, session.title).getByText('⚠ 2 unpaid')).toBeVisible();

    let clicks = 0;
    const click = async (locator: Locator) => {
      clicks += 1;
      await locator.click();
    };
    await click(rowToggle(page, session.title));
    await click(page.getByRole('button', { name: `Mark paid: ${first.name}` }));

    await expect(row(page, session.title).getByText('Marked paid')).toBeVisible();
    await expect(row(page, session.title).getByText('1 paid')).toBeVisible();
    await expect(row(page, session.title).getByText('⚠ 1 unpaid')).toBeVisible();
    expect(page.url()).toBe(scheduleUrl);
    console.log(`[QA] admin clicks from /admin to "mark paid": ${clicks}`);
    test.info().annotations.push({ type: 'clicks: mark paid', description: String(clicks) });
    expect(clicks).toBeLessThanOrEqual(2);
  });

  test('cancel a paid booking inline → it moves to Cancelled with "Refund due" (≤ 3 clicks from /admin)', async ({
    page,
    baseURL,
  }) => {
    const { admin, session, first } = await classWithTwoBookings(baseURL, 'QA Refund');
    const detail = await getAdminSession(admin, session.id);
    const paidId = detail.bookings.find((booking) => booking.email === first.email)!.id;
    await admin.patch(`/api/admin/bookings/${paidId}/payment`, { data: { paymentStatus: 'paid' } });
    await openSchedule(page);

    let clicks = 0;
    const click = async (locator: Locator) => {
      clicks += 1;
      await locator.click();
    };
    await click(rowToggle(page, session.title));
    const line = page.getByRole('region', { name: 'Roster' }).getByRole('listitem').filter({ hasText: first.email });
    await click(line.getByRole('button', { name: 'Cancel booking' }));
    await click(page.getByRole('button', { name: 'Confirm cancel' }));

    await expect(page.getByText('Booking cancelled. A refund is due.')).toBeVisible();
    const cancelled = row(page, session.title).getByRole('region', { name: 'Cancelled' });
    await expect(cancelled.getByText(first.email)).toBeVisible();
    await expect(cancelled.getByText('Refund due')).toBeVisible();
    await expect(row(page, session.title).locator('button[aria-expanded]').getByText('Refund due')).toBeVisible();
    console.log(`[QA] admin clicks from /admin to "cancel a booking": ${clicks}`);
    test.info().annotations.push({ type: 'clicks: cancel booking', description: String(clicks) });
    expect(clicks).toBeLessThanOrEqual(3);
  });

  test('remove a waitlist entry inline', async ({ page, baseURL }) => {
    const admin = await adminApi(baseURL);
    const session = await createClass(admin, { title: `QA Remove ${uniqueId()}`, capacity: 1 });
    await book((await memberApi(baseURL)).api, session.id);
    const waiter = await memberApi(baseURL);
    await joinWaitlist(waiter.api, session.id);
    await openSchedule(page);

    await rowToggle(page, session.title).click();
    const waitlist = row(page, session.title).getByRole('region', { name: 'Waitlist' });
    await waitlist.getByRole('button', { name: 'Remove' }).click();
    await page.getByRole('button', { name: 'Confirm remove' }).click();

    await expect(waitlist.getByText(`${waiter.member.name} removed from the waitlist.`)).toBeVisible();
    await expect(waitlist.getByText('No one is waiting.')).toBeVisible();
    expect((await getAdminSession(admin, session.id)).waitlist).toEqual([]);
  });

  test('search finds a class by member name (§4.2: class title, instructor, or member name/email)', async ({
    page,
    baseURL,
  }) => {
    const admin = await adminApi(baseURL);
    const session = await createClass(admin, { title: `QA Search ${uniqueId()}` });
    const name = `Quinnella ${uniqueId()}`;
    const named = await request.newContext({ baseURL });
    await signUp(named, { name });
    await book(named, session.id);
    await openSchedule(page);

    await page.getByLabel('Search classes and members').fill(name);
    await expect(row(page, session.title)).toBeVisible();
  });

  test('"+ New class" → the new row is highlighted and the class is on the public timetable', async ({ page }) => {
    await openSchedule(page);
    const title = `QA New ${uniqueId()}`;
    const start = new Date(Date.now() + 3 * 24 * 3_600_000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T10:30`;

    await page.getByRole('button', { name: '+ New class' }).click();
    const dialog = page.getByRole('dialog', { name: 'New class' });
    await expect(dialog.getByLabel('Title')).toBeFocused();
    await dialog.getByLabel('Title').fill(title);
    await dialog.getByLabel('Instructor').fill('QA Coach');
    await dialog.getByLabel('Starts').fill(local);
    await dialog.getByLabel('Capacity').fill('8');
    await dialog.getByLabel('Price (USD)').fill('12.50');
    await dialog.getByRole('button', { name: 'Create class' }).click();

    await expect(dialog).toBeHidden();
    await expect(row(page, title)).toHaveAttribute('data-highlighted', 'true');
    await expect(page.getByText('Saved')).toBeVisible();

    await page.goto('/sessions');
    const card = page.getByRole('link').filter({ hasText: title });
    await expect(card).toBeVisible();
    await expect(card.getByText('$12.50')).toBeVisible();
  });

  test('capacity below bookings shows an error; raising capacity on the full class books the first waiting member', async ({
    page,
    baseURL,
  }) => {
    const admin = await adminApi(baseURL);
    const session = await createClass(admin, { title: `QA Capacity ${uniqueId()}`, capacity: 2 });
    await book((await memberApi(baseURL)).api, session.id);
    await book((await memberApi(baseURL)).api, session.id);
    const firstWaiter = await memberApi(baseURL);
    const secondWaiter = await memberApi(baseURL);
    await joinWaitlist(firstWaiter.api, session.id);
    await joinWaitlist(secondWaiter.api, session.id);
    await openSchedule(page);

    await rowToggle(page, session.title).click();
    await row(page, session.title).getByRole('button', { name: 'Edit class' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit class' });
    await dialog.getByLabel('Capacity').fill('1');
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(dialog.getByText("Capacity can't be lower than the 2 people already booked")).toBeVisible();

    await dialog.getByLabel('Capacity').fill('3');
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(dialog).toBeHidden();

    const roster = row(page, session.title).getByRole('region', { name: 'Roster' });
    const waitlist = row(page, session.title).getByRole('region', { name: 'Waitlist' });
    await expect(roster.getByText(firstWaiter.member.email)).toBeVisible();
    await expect(waitlist.getByText(secondWaiter.member.email)).toBeVisible();
    await expect(waitlist.getByText('#1')).toBeVisible();
    const detail = await getAdminSession(admin, session.id);
    expect([detail.session.bookedCount, detail.session.capacity]).toEqual([3, 3]);
  });

  test('Delete is offered only for the never-booked class', async ({ page, baseURL }) => {
    const admin = await adminApi(baseURL);
    const empty = await createClass(admin, { title: `QA Empty ${uniqueId()}` });
    const booked = await createClass(admin, { title: `QA Booked ${uniqueId()}` });
    const cancelledOnly = await createClass(admin, { title: `QA Cancelled ${uniqueId()}` });
    await book((await memberApi(baseURL)).api, booked.id);
    const canceller = await memberApi(baseURL);
    const booking = await book(canceller.api, cancelledOnly.id);
    await canceller.api.post(`/api/bookings/${booking.id}/cancel`);
    await logIn(page.request, ADMIN_EMAIL, ADMIN_PASSWORD);

    for (const session of [booked, cancelledOnly]) {
      await page.goto(`/admin/sessions/${session.id}`);
      await expect(page.getByRole('heading', { name: session.title })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Delete class' })).toHaveCount(0);
    }

    await page.goto(`/admin/sessions/${empty.id}`);
    await page.getByRole('button', { name: 'Delete class' }).click();
    await page.getByRole('button', { name: 'Confirm delete' }).click();
    await expect(page).toHaveURL(/\/admin\/sessions(\?|$)/);
    expect((await admin.get(`/api/admin/sessions/${empty.id}`)).status()).toBe(404);
  });
});
