import { expect, test } from '@playwright/test';
import { adminApi, book, createClass, getAdminSession, joinWaitlist, memberApi, signUp, uniqueId } from './helpers/qa';

// tasks/qa.md §C waitlist.spec.ts — frontend-member + backend-member.

test.describe('Waitlist', () => {
  test('join a full class → My bookings shows "#3 in line"', async ({ page, baseURL }) => {
    const admin = await adminApi(baseURL);
    const session = await createClass(admin, { title: `QA Line ${uniqueId()}`, capacity: 1 });
    const owner = await memberApi(baseURL);
    await book(owner.api, session.id);
    for (let i = 0; i < 2; i += 1) await joinWaitlist((await memberApi(baseURL)).api, session.id);
    await signUp(page.request);

    await page.goto(`/sessions/${session.id}`);
    await page.getByRole('button', { name: 'Join waitlist' }).click();

    await expect(page).toHaveURL('/account');
    const card = page.getByRole('article').filter({ hasText: session.title });
    await expect(card.getByText("You're #3 in line")).toBeVisible();
  });

  test('the owner cancels in another browser → the first waiting member sees "You got a place!" on focus, then after reload', async ({
    browser,
    baseURL,
  }) => {
    const admin = await adminApi(baseURL);
    const session = await createClass(admin, { title: `QA Promote ${uniqueId()}`, capacity: 1 });

    const ownerContext = await browser.newContext();
    const waiterContext = await browser.newContext();
    const secondContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const waiterPage = await waiterContext.newPage();
    const secondPage = await secondContext.newPage();
    await signUp(ownerContext.request);
    await book(ownerContext.request, session.id);
    await signUp(waiterContext.request);
    await joinWaitlist(waiterContext.request, session.id);
    await signUp(secondContext.request);
    await joinWaitlist(secondContext.request, session.id);

    await waiterPage.goto('/account');
    await expect(waiterPage.getByRole('article').filter({ hasText: session.title }).getByText("You're #1 in line")).toBeVisible();

    await ownerPage.goto('/account');
    const ownerCard = ownerPage.getByRole('article').filter({ hasText: session.title });
    await ownerCard.getByRole('button', { name: 'Cancel booking' }).click();
    await ownerPage.getByRole('button', { name: 'Yes, cancel' }).click();
    await expect(ownerPage.getByText('Nothing booked yet')).toBeVisible();

    // The waiter's page was already open: it refreshes when the window regains focus.
    await waiterPage.bringToFront();
    await waiterPage.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(waiterPage.getByText('You got a place!')).toBeVisible();
    await waiterPage.reload();
    await expect(waiterPage.getByText('You got a place!')).toBeVisible();
    await expect(waiterPage.getByRole('article').filter({ hasText: session.title }).getByText('Confirmed')).toBeVisible();

    // Only the first in line got it: the second member is now #1 and was not promoted.
    await secondPage.goto('/account');
    await expect(secondPage.getByRole('article').filter({ hasText: session.title }).getByText("You're #1 in line")).toBeVisible();
    await expect(secondPage.getByText('You got a place!')).toHaveCount(0);

    const detail = await getAdminSession(admin, session.id);
    expect(detail.session.bookedCount).toBe(1);
    await Promise.all([ownerContext.close(), waiterContext.close(), secondContext.close()]);
  });

  test('leave the waitlist from My bookings', async ({ page, baseURL }) => {
    const admin = await adminApi(baseURL);
    const session = await createClass(admin, { title: `QA Leave ${uniqueId()}`, capacity: 1 });
    await book((await memberApi(baseURL)).api, session.id);
    const member = await signUp(page.request);
    await joinWaitlist(page.request, session.id);

    await page.goto('/account');
    const card = page.getByRole('article').filter({ hasText: session.title });
    await card.getByRole('button', { name: 'Leave waitlist' }).click();
    await page.getByRole('button', { name: 'Yes, leave' }).click();

    await expect(card).toHaveCount(0);
    await expect(page.getByText('Nothing booked yet')).toBeVisible();
    const detail = await getAdminSession(admin, session.id);
    expect(detail.waitlist.map((entry) => entry.email)).not.toContain(member.email);
  });
});
