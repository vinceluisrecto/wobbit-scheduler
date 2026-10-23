import { gzipSync } from 'node:zlib';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { SEED_MEMBER_PASSWORD, SEED_SESSION_IDS } from '@/constants/seed';
import { ADMIN_EMAIL, ADMIN_PASSWORD, adminApi, createClass, logIn, signUp, uniqueId } from './helpers/qa';

// tasks/qa.md §F — design and responsive regression (§4). Read-only against seeded data.

const WIDTHS = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
];

interface View {
  name: string;
  open: (page: Page) => Promise<void>;
  primary: (page: Page) => Locator; // the action that must be on screen without scrolling
}

const VIEWS: View[] = [
  { name: 'landing', open: (page) => page.goto('/').then(() => undefined), primary: (page) => page.getByRole('link', { name: 'See classes' }).first() },
  {
    name: 'sessions',
    open: (page) => page.goto('/sessions').then(() => undefined),
    primary: (page) => page.getByRole('main').getByRole('link').filter({ hasText: 'min' }).first(),
  },
  {
    name: 'session-detail',
    open: async (page) => {
      await signUp(page.request);
      await page.goto(`/sessions/${SEED_SESSION_IDS.open}`);
    },
    primary: (page) => page.getByRole('button', { name: 'Book', exact: true }),
  },
  {
    name: 'account',
    open: async (page) => {
      await logIn(page.request, 'maya@example.com', SEED_MEMBER_PASSWORD);
      await page.goto('/account');
      await expect(page.getByRole('tab', { name: /Upcoming/ })).toBeVisible();
      // Cancel is per item, not the page's primary action: it only has to be reachable and big enough.
      const cancel = page.getByRole('button', { name: 'Cancel booking' }).first();
      await cancel.scrollIntoViewIfNeeded();
      await expect(cancel).toBeInViewport();
      expect((await cancel.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await page.evaluate(() => window.scrollTo(0, 0));
    },
    primary: (page) => page.getByRole('tab', { name: /Upcoming/ }),
  },
  {
    name: 'admin-collapsed',
    open: async (page) => {
      await logIn(page.request, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto('/admin/sessions');
      await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
    },
    primary: (page) => page.getByRole('button', { name: '+ New class' }),
  },
  {
    name: 'admin-expanded',
    open: async (page) => {
      await logIn(page.request, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto('/admin/sessions');
      const row = page.getByRole('listitem').filter({ has: page.getByText('Power Pilates', { exact: true }) });
      await row.locator('button[aria-expanded]').click();
      await expect(row.getByRole('region', { name: 'Roster', exact: true })).toBeVisible();
      await row.getByRole('region', { name: 'Roster', exact: true }).getByRole('listitem').first().scrollIntoViewIfNeeded();
    },
    primary: (page) => page.getByRole('region', { name: 'Roster', exact: true }).getByRole('button', { name: /^Mark (paid|unpaid):/ }).first(),
  },
];

interface SmallTarget {
  label: string;
  width: number;
  height: number;
  inline: boolean; // a link inside running text (exempt under WCAG 2.5.8)
}

// Every visible interactive element smaller than 44×44 CSS px.
async function smallTapTargets(page: Page): Promise<SmallTarget[]> {
  return page.evaluate(() => {
    const selector = 'a[href], button, input:not([type=hidden]), select, textarea, [role=tab], summary';
    return [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((element) => element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
      .filter((element) => !element.closest('[inert]'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const label = (element.getAttribute('aria-label') ?? element.textContent ?? element.getAttribute('name') ?? '')
          .trim()
          .replace(/\s+/g, ' ')
          .slice(0, 40);
        const inline = element.tagName === 'A' && element.closest('p') !== null;
        return { label: `${element.tagName.toLowerCase()} "${label}"`, width: Math.round(rect.width), height: Math.round(rect.height), inline };
      })
      .filter((target) => target.width > 0 && (target.width < 44 || target.height < 44));
  });
}

test.describe('Responsive (§4.3)', () => {
  for (const viewport of WIDTHS) {
    for (const view of VIEWS) {
      test(`${view.name} @ ${viewport.width}px: no horizontal scroll, primary action visible, tap targets ≥ 44px`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await view.open(page);
        await page.waitForLoadState('networkidle');

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);

        const primary = view.primary(page);
        await expect(primary).toBeVisible();
        await expect(primary).toBeInViewport();
        const box = (await primary.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.height).toBeGreaterThanOrEqual(44);

        const small = await smallTapTargets(page);
        const blocking = small.filter((target) => !target.inline);
        test.info().annotations.push({ type: 'small tap targets', description: JSON.stringify(small) });
        if (small.length) console.log(`[QA] ${view.name}@${viewport.width} targets < 44px: ${JSON.stringify(small)}`);

        await page.screenshot({ path: test.info().outputPath(`${view.name}-${viewport.width}.png`), fullPage: true });
        expect(blocking, 'non-inline tap targets under 44×44px').toEqual([]);
      });
    }
  }

  for (const width of [375, 390]) {
    test(`sticky Book bar on mobile @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      await signUp(page.request);
      await page.goto(`/sessions/${SEED_SESSION_IDS.open}`);
      const book = page.getByRole('button', { name: 'Book', exact: true });
      await expect(book).toBeInViewport();
      const bar = book.locator('xpath=ancestor::div[contains(@class,"fixed")][1]');
      expect(await bar.evaluate((element) => getComputedStyle(element).position)).toBe('fixed');
      const before = (await book.boundingBox())!;
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(200);
      const after = (await book.boundingBox())!;
      expect(after.y).toBe(before.y); // stays put while the page scrolls
      expect(before.y + before.height).toBeGreaterThan(700 - 80); // sits at the bottom, within thumb reach
    });
  }

  test('admin paid/cancel stay visible on mobile cards (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await VIEWS.find((view) => view.name === 'admin-expanded')!.open(page);
    const line = page.getByRole('region', { name: 'Roster', exact: true }).getByRole('listitem').first();
    for (const button of [line.getByRole('button', { name: /^Mark (paid|unpaid):/ }), line.getByRole('button', { name: 'Cancel booking' })]) {
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeVisible();
      const box = (await button.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});

// Running animations that move things (transform / translate / scale / rotate).
// Loading spinners are exempt: §4.1 keeps functional feedback (loading, focus) visible under reduced motion.
async function movingAnimations(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => animation.playState === 'running')
      .filter((animation) => !((animation.effect as KeyframeEffect | null)?.target as Element | null)?.closest('.animate-spin'))
      .filter((animation) => {
        const keyframes = (animation.effect as KeyframeEffect | null)?.getKeyframes() ?? [];
        return keyframes.some((frame) => ['transform', 'translate', 'scale', 'rotate'].some((prop) => prop in frame && frame[prop] !== 'none'));
      })
      .map((animation) => {
        const target = (animation.effect as KeyframeEffect).target as Element | null;
        const name = 'animationName' in animation ? (animation as CSSAnimation).animationName : animation.id;
        return `${animation.constructor.name} "${name}" on <${target?.tagName.toLowerCase()} class="${target?.getAttribute('class') ?? ''}">`;
      }),
  );
}

test.describe('Reduced motion (§4.1)', () => {
  test('with motion allowed, the landing does animate (control for the check below)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);
    const moving = await movingAnimations(page);
    console.log(`[QA] motion allowed: ${moving.length} transform animations running on /`);
    expect(moving.length).toBeGreaterThan(0);
  });

  test.describe('prefers-reduced-motion: reduce', () => {
    test.use({ reducedMotion: 'reduce' });

    for (const path of ['/', '/sessions', '/account', `/sessions/${SEED_SESSION_IDS.fillingFast}`]) {
      test(`${path}: no transform animations and nothing left hidden`, async ({ page }) => {
        await logIn(page.request, 'maya@example.com', SEED_MEMBER_PASSWORD);
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);
        expect(await movingAnimations(page)).toEqual([]);

        const hidden = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('main h1, main h2, main h3, main p, main a, main button')]
            .filter((element) => element.getBoundingClientRect().width > 0)
            .filter((element) => !element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
            .map((element) => element.textContent?.trim().slice(0, 40)),
        );
        expect(hidden).toEqual([]);
      });
    }

    test('actions still work: book a class and see the confirmation', async ({ page, baseURL }) => {
      const session = await createClass(await adminApi(baseURL), { title: `QA Reduced ${uniqueId()}` });
      await signUp(page.request);
      await page.goto(`/sessions/${session.id}`);
      await page.getByRole('button', { name: 'Book', exact: true }).click();
      await expect(page.getByRole('status').filter({ hasText: "You're booked!" })).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(await movingAnimations(page)).toEqual([]);
    });
  });
});

test.describe('Landing regression', () => {
  test.describe('JavaScript disabled', () => {
    test.use({ javaScriptEnabled: false });

    test('all landing content is visible', async ({ page }) => {
      await page.goto('/');
      const hidden = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('main h1, main h2, main h3, main p, main a, main li')]
          .filter((element) => !element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
          .map((element) => element.textContent?.trim().slice(0, 40)),
      );
      expect(hidden).toEqual([]);
      await expect(page.getByRole('link', { name: 'See classes' }).first()).toBeVisible();
    });
  });

  test('no /admin links on public pages', async ({ page }) => {
    await signUp(page.request);
    for (const path of ['/', '/sessions', `/sessions/${SEED_SESSION_IDS.open}`, '/account', '/login', '/signup', '/forgot-password']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(await page.locator('a[href*="/admin"]').count(), path).toBe(0);
    }
  });
});

test.describe('anime.js bundle (§4.1 / D17)', () => {
  const ANIME_MARKER = 'animejs-onscroll-debug'; // a string literal from anime.js that survives minification

  async function animeChunks(page: Page, path: string): Promise<{ url: string; bytes: number; gzip: number }[]> {
    const found: { url: string; bytes: number; gzip: number }[] = [];
    page.on('response', async (response) => {
      if (response.request().resourceType() !== 'script') return;
      const body = await response.body().catch(() => null);
      if (body && body.includes(ANIME_MARKER)) {
        found.push({ url: new URL(response.url()).pathname, bytes: body.length, gzip: gzipSync(body).length });
      }
    });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    return found;
  }

  test('loaded on the landing page, absent from every /admin page', async ({ page }) => {
    const landing = await animeChunks(page, '/');
    console.log(`[QA] anime.js chunks on /: ${JSON.stringify(landing)}`);
    expect(landing.length).toBeGreaterThan(0);

    await logIn(page.request, ADMIN_EMAIL, ADMIN_PASSWORD);
    for (const path of ['/admin/login', '/admin/sessions', '/admin/sessions/new', `/admin/sessions/${SEED_SESSION_IDS.open}`]) {
      const adminPage = await page.context().newPage();
      const chunks = await animeChunks(adminPage, path);
      console.log(`[QA] anime.js chunks on ${path}: ${JSON.stringify(chunks)}`);
      expect(chunks, path).toEqual([]);
      await adminPage.close();
    }
  });
});

// Lab LCP / CLS with Lighthouse's mobile throttling settings, via the Chrome DevTools Protocol.
// Lighthouse itself isn't installed (adding it needs approval), so this is the documented substitute.
test.describe('Performance budget (§4.1): LCP < 2.5s, CLS < 0.1, mobile throttled', () => {
  for (const path of ['/', '/sessions']) {
    test(`${path}`, async ({ browser }) => {
      const results: { lcp: number; cls: number }[] = [];
      for (let run = 0; run < 3; run += 1) {
        const context = await browser.newContext({
          viewport: { width: 412, height: 823 },
          deviceScaleFactor: 1.75,
          isMobile: true,
          hasTouch: true,
        });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: 150,
          downloadThroughput: (1638.4 * 1024) / 8,
          uploadThroughput: (750 * 1024) / 8,
        });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await page.addInitScript(() => {
          const metrics = { lcp: 0, cls: 0 };
          (window as unknown as { __qa: typeof metrics }).__qa = metrics;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) metrics.lcp = entry.startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
              if (!entry.hadRecentInput) metrics.cls += entry.value;
            }
          }).observe({ type: 'layout-shift', buffered: true });
        });
        await page.goto(path, { waitUntil: 'load' });
        await page.waitForTimeout(3_000);
        results.push(await page.evaluate(() => (window as unknown as { __qa: { lcp: number; cls: number } }).__qa));
        await context.close();
      }
      const median = (values: number[]) => values.sort((a, b) => a - b)[1];
      const lcp = median(results.map((r) => r.lcp));
      const cls = median(results.map((r) => r.cls));
      console.log(`[QA] ${path} mobile-throttled runs: ${JSON.stringify(results.map((r) => ({ lcp: Math.round(r.lcp), cls: Number(r.cls.toFixed(4)) })))} → median LCP ${Math.round(lcp)}ms, CLS ${cls.toFixed(4)}`);
      test.info().annotations.push({ type: 'LCP ms (median of 3)', description: String(Math.round(lcp)) }, { type: 'CLS', description: cls.toFixed(4) });
      expect(lcp).toBeLessThan(2_500);
      expect(cls).toBeLessThan(0.1);
    });
  }
});
