import { expect, test, type Page } from '@playwright/test';
import { SEED_SESSION_IDS } from '@/constants/seed';
import { adminApi, book, createClass, fillLogin, getAdminSession, memberApi, signUp, uniqueId } from './helpers/qa';

// tasks/qa.md §C booking.spec.ts — frontend-member + backend-member.

function bookButton(page: Page) {
  return page.getByRole('button', { name: 'Book', exact: true });
}

test.describe('Booking', () => {
  test('logged out: Book → log in → back to the class → book → the booking page shows the details and price', async ({
    page,
    baseURL,
  }) => {
    const admin = await adminApi(baseURL);
    const session = await createClass(admin, { title: `QA Flow ${uniqueId()}`, capacity: 5, priceCents: 1500 });
    const { member } = await memberApi(baseURL); // an existing account; this browser stays logged out

    await page.goto(`/sessions/${session.id}`);
    await page.getByRole('link', { name: 'Log in to book' }).click();

    await expect(page).toHaveURL(/\/login\?next=/);
    expect(new URL(page.url()).searchParams.get('next')).toBe(`/sessions/${session.id}`);
    await fillLogin(page, member.email, member.password);

    await expect(page).toHaveURL(`/sessions/${session.id}`);
    await bookButton(page).click();

    await expect(page).toHaveURL(/\/bookings\/[0-9a-f-]{36}/);
    await expect(page.getByRole('status').filter({ hasText: "You're booked!" })).toBeVisible();
    await expect(page.getByText(session.title)).toBeVisible();
    await expect(page.getByText('$15.00')).toBeVisible();
    await expect(page.getByText('Pay at the studio')).toBeVisible();
    await expect(page.getByText('Confirmed', { exact: true })).toBeVisible();

    // The page only says "booked" after the API's 201: the database agrees.
    const detail = await getAdminSession(admin, session.id);
    expect(detail.bookings.map((b) => [b.email, b.status])).toEqual([[member.email, 'confirmed']]);
  });

  test('a full class shows "Full" and offers Join waitlist instead of Book', async ({ page, baseURL }) => {
    const admin = await adminApi(baseURL);
    const session = await createClass(admin, { title: `QA Full ${uniqueId()}`, capacity: 1 });
    const other = await memberApi(baseURL);
    await book(other.api, session.id);
    await signUp(page.request);

    await page.goto('/sessions');
    const card = page.getByRole('link').filter({ hasText: session.title });
    await expect(card.getByText('Full', { exact: true })).toBeVisible();
    await expect(card.getByText('Join waitlist')).toBeVisible();

    await card.click();
    await expect(page.getByRole('button', { name: 'Join waitlist' })).toBeVisible();
    await expect(bookButton(page)).toHaveCount(0);
  });

  test('the 1-spot class booked by two members at once: one confirmation, the other sees "just filled up" then Join waitlist', async ({
    browser,
    baseURL,
  }) => {
    const admin = await adminApi(baseURL);
    const session = await createClass(admin, { title: `QA Race ${uniqueId()}`, capacity: 1 });
    const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
    const pages = await Promise.all(contexts.map((context) => context.newPage()));
    await Promise.all(contexts.map((context) => signUp(context.request)));
    await Promise.all(pages.map((page) => page.goto(`/sessions/${session.id}`)));
    await Promise.all(pages.map((page) => expect(bookButton(page)).toBeEnabled()));

    await Promise.all(pages.map((page) => bookButton(page).click()));

    const outcomes = await Promise.all(
      pages.map((page) =>
        Promise.race([
          page.waitForURL(/\/bookings\//).then(() => 'booked'),
          page.getByText('This class just filled up').waitFor().then(() => 'filled up'),
        ]),
      ),
    );
    expect([...outcomes].sort()).toEqual(['booked', 'filled up']);

    const loser = pages[outcomes.indexOf('filled up')];
    await expect(loser.getByRole('button', { name: 'Join waitlist' })).toBeVisible();
    const detail = await getAdminSession(admin, session.id);
    expect(detail.session.bookedCount).toBe(1);
    await Promise.all(contexts.map((context) => context.close()));
  });

  test('a class that has started shows "Already started" and cannot be booked', async ({ page }) => {
    await signUp(page.request);
    await page.goto(`/sessions/${SEED_SESSION_IDS.past}`);

    const action = page.getByRole('button', { name: 'Already started' });
    await expect(action).toBeVisible();
    await expect(action).toBeDisabled();
    await expect(bookButton(page)).toHaveCount(0);
  });
});
