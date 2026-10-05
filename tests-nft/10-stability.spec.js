import { test, expect } from '@playwright/test';

import { metric, openWall, noteText } from './helpers.js';

// Precise heap numbers (Chromium rounds performance.memory without this flag)
test.use({ launchOptions: { args: ['--enable-precise-memory-info'] } });

test('long session: 200 live notes, no errors, bounded memory', async ({ page, request }) => {
  const errors = [];
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
  page.on('pageerror', (err) => errors.push(err.message));

  await openWall(page);
  const before = await page.evaluate(() => performance.memory.usedJSHeapSize);
  const startCount = await page.locator('.note').count();

  const tag = `Soak-${Date.now()}`;
  for (let i = 0; i < 200; i += 20) {
    await Promise.all(
      Array.from({ length: 20 }, (_, j) =>
        request.post('/api/feedbacks', { data: { message: `${tag} ${i + j}` } }),
      ),
    );
  }
  await expect(page.locator('.note-message', { hasText: tag })).toHaveCount(200, { timeout: 15_000 });
  await expect(page.locator('.note')).toHaveCount(startCount + 200);

  const after = await page.evaluate(() => performance.memory.usedJSHeapSize);
  metric('JS memory growth after 200 live notes', (after - before) / (1024 * 1024), 'MB', 30);
  expect(errors, 'no console errors during the session').toEqual([]);
});

test('opening and closing 30 tabs leaves the server healthy', async ({ browser, request, page }) => {
  const context = await browser.newContext();
  for (let i = 0; i < 30; i++) {
    const tab = await context.newPage();
    await openWall(tab);
    await tab.close();
  }
  await context.close();

  // Server still answers and still pushes live updates to a new viewer
  await openWall(page);
  const message = `After tabs ${Date.now()}`;
  const res = await request.post('/api/feedbacks', { data: { message } });
  expect(res.status()).toBe(201);
  await expect(noteText(page, message)).toBeVisible();
});
