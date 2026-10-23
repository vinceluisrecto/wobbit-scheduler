import { expect, test } from '@playwright/test';

test.describe('Landing page', () => {
  test('shows the hero, how it works, and this week\'s classes', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Move\.\s*Breathe\.\s*Book\s*in\s*one\s*tap\./);
    await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'How it works' }).getByRole('listitem')).toHaveCount(3);

    // "This week" previews up to 3 upcoming classes from the seed data.
    const thisWeek = page.getByRole('region', { name: 'This week' });
    await expect(thisWeek.getByRole('link', { name: /min/ }).first()).toBeVisible();
    expect(await thisWeek.getByRole('link', { name: /min/ }).count()).toBeLessThanOrEqual(3);
  });

  test('the hero CTA goes to the timetable', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'See classes' }).first().click();

    await expect(page).toHaveURL(/\/sessions$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Classes' })).toBeVisible();
  });

  test('has no admin links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /admin/i })).toHaveCount(0);
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('the landing content is still visible', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Your spot is waiting.' })).toBeVisible();
    });
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('nothing is left hidden or offset by the entrance animation', async ({ page }) => {
      await page.goto('/');

      const firstWord = page.locator('[data-hero-word]').first();
      await expect(firstWord).toHaveCSS('opacity', '1');
      await expect(firstWord).toHaveCSS('transform', 'none');
    });
  });
});
