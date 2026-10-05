import { test, expect } from '@playwright/test';
import { metric, uniqueText, noteText } from './helpers.js';

test('page is usable on a slow mobile network (Fast 3G)', async ({ page, context }) => {
  // Chromium DevTools network throttling: ~1.6 Mbps down, 750 Kbps up, 150 ms latency
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });

  const start = Date.now();
  await page.goto('/', { timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Post' })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.note').first()).toBeVisible({ timeout: 30_000 });
  metric('Usable on Fast 3G', Date.now() - start, 'ms', 8000);

  const message = uniqueText('Slow network');
  await page.getByLabel('Your feedback').fill(message);
  const postStart = Date.now();
  await page.getByRole('button', { name: 'Post' }).click();
  await expect(noteText(page, message)).toBeVisible({ timeout: 15_000 });
  metric('Post → visible on Fast 3G', Date.now() - postStart, 'ms', 2000);
});

test('going offline shows an error, and posting works again once back online', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Post' })).toBeVisible();

  await context.setOffline(true);
  await page.getByLabel('Your feedback').fill('Posted while offline');
  await page.getByRole('button', { name: 'Post' }).click();
  await expect(page.getByText('Could not reach the server')).toBeVisible();
  await expect(page.getByLabel('Your feedback')).toHaveValue('Posted while offline');

  await context.setOffline(false);
  const message = uniqueText('Back online');
  await page.getByLabel('Your feedback').fill(message);
  await page.getByRole('button', { name: 'Post' }).click();
  // The live stream may still be reconnecting, so a reload proves the note was saved
  await expect(page.getByText('Could not reach the server')).toBeHidden();
  await page.reload();
  await expect(noteText(page, message)).toBeVisible();
});
