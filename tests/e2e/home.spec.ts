import { expect, test } from '@playwright/test';

test.describe('Home page', () => {
  test('shows the hero and features', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1, name: /plan, track, and ship your work/i }),
    ).toBeVisible();
    await expect(page.locator('#features').getByRole('listitem')).toHaveCount(3);
  });

  test('scrolls to the features section from the hero', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'See features' }).click();

    await expect(page).toHaveURL(/#features$/);
    await expect(page.getByRole('heading', { name: /everything you need/i })).toBeInViewport();
  });
});
