import { test, expect } from '@playwright/test';
import { metric, percentile, openWall, uniqueText, noteText } from './helpers.js';

test('post in browser A → visible in browser B (20 samples)', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const userA = await contextA.newPage();
  const userB = await contextB.newPage();
  await openWall(userA);
  await openWall(userB);
  const samples = [];

  for (let i = 0; i < 20; i++) {
    const message = uniqueText('Live latency');
    await userA.getByLabel('Your feedback').fill(message);
    const start = Date.now();
    await userA.getByRole('button', { name: 'Post' }).click();
    await expect(noteText(userB, message)).toBeVisible();
    samples.push(Date.now() - start);
    await expect(userA.getByLabel('Your feedback')).toHaveValue('');
  }

  metric('Live update A → B (median)', percentile(samples, 50), 'ms', 300);
  metric('Live update A → B (p95)', percentile(samples, 95), 'ms', 500);

  await contextA.close();
  await contextB.close();
});
