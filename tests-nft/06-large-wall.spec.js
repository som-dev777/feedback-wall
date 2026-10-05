import { test, expect } from '@playwright/test';
import { metric, openWall } from './helpers.js';

test('wall with 1,000+ notes loads, renders and scrolls', async ({ page, request }) => {
  // Top the wall up to at least 1,000 notes
  const existing = (await (await request.get('/api/feedbacks')).json()).length;
  const toAdd = Math.max(0, 1000 - existing);
  for (let i = 0; i < toAdd; i += 50) {
    await Promise.all(
      Array.from({ length: Math.min(50, toAdd - i) }, (_, j) =>
        request.post('/api/feedbacks', { data: { message: `Bulk note ${i + j}` } }),
      ),
    );
  }
  const total = (await (await request.get('/api/feedbacks')).json()).length;
  console.log(`  (wall size: ${total} notes)`);

  const start = Date.now();
  await page.goto('/');
  await expect(page.locator('.note')).toHaveCount(total, { timeout: 15_000 });
  metric(`Load + render ${total} notes`, Date.now() - start, 'ms', 3000);

  // Scroll to the bottom and back; the page must stay responsive
  const scrollStart = Date.now();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.locator('.note').last()).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('.note').first()).toBeInViewport();
  metric('Scroll to bottom and back', Date.now() - scrollStart, 'ms', 1000);

  // Typing must still feel instant with a big wall on screen
  const typeStart = Date.now();
  await page.getByLabel('Your feedback').fill('Still responsive?');
  await expect(page.getByText('17/280')).toBeVisible();
  metric('Typing response with big wall', Date.now() - typeStart, 'ms', 300);
});

test('a burst of 50 live notes into a 1,000-note wall shows up quickly', async ({ page, request }) => {
  await openWall(page);
  const before = await page.locator('.note').count();

  const tag = `Big-burst-${Date.now()}`;
  const start = Date.now();
  await Promise.all(
    Array.from({ length: 50 }, (_, i) => request.post('/api/feedbacks', { data: { message: `${tag} #${i}` } })),
  );
  await expect(page.locator('.note-message', { hasText: tag })).toHaveCount(50, { timeout: 15_000 });
  metric(`50 live notes into a ${before}-note wall`, Date.now() - start, 'ms', 1000);
});
