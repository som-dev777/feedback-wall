import { test, expect } from '@playwright/test';
import { metric, percentile, openWall, uniqueText, noteText } from './helpers.js';

test('click Post → own note visible (20 samples)', async ({ page }) => {
  await openWall(page);
  const samples = [];

  for (let i = 0; i < 20; i++) {
    const message = uniqueText('Latency');
    await page.getByLabel('Your feedback').fill(message);
    const start = Date.now();
    await page.getByRole('button', { name: 'Post' }).click();
    await expect(noteText(page, message)).toBeVisible();
    samples.push(Date.now() - start);
    await expect(page.getByLabel('Your feedback')).toHaveValue('');
  }

  metric('Post → visible (median)', percentile(samples, 50), 'ms', 300);
  metric('Post → visible (p95)', percentile(samples, 95), 'ms', 500);
  metric('Post → visible (max)', Math.max(...samples), 'ms', 1000);
});
