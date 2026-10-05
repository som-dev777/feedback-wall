import { test, expect } from '@playwright/test';
import { metric } from './helpers.js';

test('page load speed and visual stability (Core Web Vitals)', async ({ page, request }) => {
  // A realistic wall: 30 notes
  for (let i = 0; i < 30; i++) {
    await request.post('/api/feedbacks', { data: { name: `User ${i}`, message: `Seed note ${i}` } });
  }

  await page.goto('/');
  await expect(page.locator('.note')).toHaveCount(30);

  const vitals = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const nav = performance.getEntriesByType('navigation')[0];
        let fcp = -1;
        let lcp = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) if (e.name === 'first-contentful-paint') fcp = e.startTime;
        }).observe({ type: 'paint', buffered: true });
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) lcp = e.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) if (!e.hadRecentInput) cls += e.value;
        }).observe({ type: 'layout-shift', buffered: true });
        // Give buffered entries (and late font swaps) a moment to arrive
        setTimeout(
          () =>
            resolve({
              ttfb: nav.responseStart - nav.requestStart,
              domContentLoaded: nav.domContentLoadedEventEnd,
              load: nav.loadEventEnd,
              fcp,
              lcp,
              cls,
              // Bytes actually sent over the network (after gzip), page + our own files
              transferKB:
                (nav.transferSize +
                  performance
                    .getEntriesByType('resource')
                    .filter((r) => r.name.startsWith(location.origin) && !r.name.includes('/stream'))
                    .reduce((sum, r) => sum + r.transferSize, 0)) /
                1024,
            }),
          1500,
        );
      }),
  );

  expect(vitals.fcp, 'browser must report a first contentful paint').toBeGreaterThan(0);
  metric('Time to first byte', vitals.ttfb, 'ms', 200);
  metric('First contentful paint', vitals.fcp, 'ms', 1000);
  metric('Largest contentful paint', vitals.lcp, 'ms', 1500);
  metric('DOM content loaded', vitals.domContentLoaded, 'ms', 1000);
  metric('Full page load', vitals.load, 'ms', 2000);
  metric('Cumulative layout shift', vitals.cls, 'score', 0.1);
  metric('Data transferred from app server (gzip)', vitals.transferKB, 'KB', 150);
});

test('wall content is visible quickly after navigation', async ({ page }) => {
  const start = Date.now();
  await page.goto('/');
  await expect(page.locator('.note').first()).toBeVisible();
  metric('Navigation to first note visible', Date.now() - start, 'ms', 1500);
});

test('repeat visit: hashed files come from the browser cache', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.note').first()).toBeVisible();

  // Same browser, second visit
  await page.goto('/');
  await expect(page.locator('.note').first()).toBeVisible();
  const assets = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((r) => r.name.includes('/assets/'))
      .map((r) => ({ name: r.name, transferSize: r.transferSize })),
  );
  expect(assets.length).toBeGreaterThan(0);
  const fromNetworkKB = assets.reduce((sum, a) => sum + a.transferSize, 0) / 1024;
  metric('Asset bytes re-downloaded on repeat visit', fromNetworkKB, 'KB', 1);
});

test('server sends compressed, long-cached assets', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const js = html.match(/\/assets\/[^"]+\.js/)[0];
  const res = await request.get(js, { headers: { 'Accept-Encoding': 'gzip' } });
  expect(res.headers()['content-encoding']).toBe('gzip');
  expect(res.headers()['cache-control']).toContain('immutable');

  // index.html must not be cached long, or users would miss new deploys
  const page = await request.get('/');
  expect(page.headers()['cache-control']).toContain('max-age=0');
});
