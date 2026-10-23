import { expect, test } from '@playwright/test';
import { SEED_MEMBER_PASSWORD } from '@/constants/seed';
import {
  adminApi,
  book,
  clearInbox,
  createClass,
  fillLogin,
  linkIn,
  logIn,
  signUp,
  uniqueId,
  waitForEmail,
} from './helpers/qa';

// tasks/qa.md §C account.spec.ts — frontend-member + backend-member.

test.describe('My bookings', () => {
  test('Upcoming and Past tabs show the right items with booking and payment status (seeded member Maya, read-only)', async ({
    page,
  }) => {
    await logIn(page.request, 'maya@example.com', SEED_MEMBER_PASSWORD);
    await page.goto('/account');

    const upcoming = (title: string) => page.getByRole('article').filter({ hasText: title });
    await expect(page.getByRole('tab', { name: /Upcoming/ })).toHaveAttribute('aria-selected', 'true');
    await expect(upcoming('Morning Flow Yoga').getByText('Paid', { exact: true })).toBeVisible();
    await expect(upcoming('HIIT Burn').getByText('Unpaid', { exact: true })).toBeVisible();
    await expect(upcoming('HIIT Burn').getByText(/Pay at the studio/)).toBeVisible();
    await expect(upcoming('Sunset Vinyasa').getByText("You're #2 in line")).toBeVisible();
    await expect(upcoming('Core Strength')).toHaveCount(0); // past class isn't upcoming

    await page.getByRole('tab', { name: /Past/ }).click();
    const past = (title: string) => page.getByRole('article').filter({ hasText: title });
    await expect(past('Core Strength').getByText('Paid', { exact: true })).toBeVisible();
    await expect(past('Lunchtime Stretch').getByText('Cancelled by you')).toBeVisible();
    await expect(past('Morning Flow Yoga')).toHaveCount(0);
  });

  test('cancel an upcoming booking → it shows as "Cancelled by you"; booking the same class again works', async ({
    page,
    baseURL,
  }) => {
    const admin = await adminApi(baseURL);
    const session = await createClass(admin, { title: `QA Cancel ${uniqueId()}`, capacity: 3 });
    await signUp(page.request);
    await book(page.request, session.id);

    await page.goto('/account');
    await page.getByRole('article').filter({ hasText: session.title }).getByRole('button', { name: 'Cancel booking' }).click();
    await page.getByRole('button', { name: 'Yes, cancel' }).click();
    await expect(page.getByText('Nothing booked yet')).toBeVisible();

    await page.getByRole('tab', { name: /Past/ }).click();
    await expect(page.getByRole('article').filter({ hasText: session.title }).getByText('Cancelled by you')).toBeVisible();

    await page.goto(`/sessions/${session.id}`);
    await page.getByRole('button', { name: 'Book', exact: true }).click();
    await expect(page).toHaveURL(/\/bookings\//);
    await expect(page.getByText('Confirmed', { exact: true })).toBeVisible();
  });

  test('forgot password → reset link from Mailpit → new password → log in; the link fails the second time', async ({
    page,
    browser,
    baseURL,
  }) => {
    const otherDevice = await browser.newContext({ baseURL });
    const member = await signUp(otherDevice.request);
    await otherDevice.close();
    await clearInbox(member.email);

    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill(member.email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText("If that email has an account, we've sent a reset link")).toBeVisible();

    const email = await waitForEmail(member.email, 'Reset your password');
    const link = linkIn(email);
    expect(link.pathname).toBe('/reset-password');
    const resetPath = `${link.pathname}${link.search}`;

    await page.goto(resetPath);
    await page.getByLabel('New password').fill('a-brand-new-pass');
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page.getByText('Password updated, please log in')).toBeVisible();

    await page.getByRole('main').getByRole('link', { name: 'Log in' }).click();
    await fillLogin(page, member.email, 'a-brand-new-pass');
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();

    // The link is single-use.
    await page.goto(resetPath);
    await page.getByLabel('New password').fill('yet-another-pass');
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page.getByText('This link has expired or was already used')).toBeVisible();
  });
});
