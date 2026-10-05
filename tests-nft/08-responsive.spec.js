import { test, expect, devices } from '@playwright/test';
import { uniqueText, noteText } from './helpers.js';

const viewports = [
  { name: 'small phone', width: 360, height: 740 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'wide desktop', width: 1920, height: 1080 },
];

for (const vp of viewports) {
  test(`${vp.name} (${vp.width}px): no sideways scroll, form and wall visible`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    await expect(page.locator('.note').first()).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'page must not scroll sideways').toBeLessThanOrEqual(0);
    await expect(page.getByLabel('Your feedback')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Post' })).toBeVisible();
  });
}

test.describe('real phone emulation (Pixel 7, touch)', () => {
  // defaultBrowserType can only be set per project, so leave it out here
  const { defaultBrowserType, ...pixel7 } = devices['Pixel 7'];
  test.use(pixel7);

  test('a phone user can post with taps', async ({ page }) => {
    await page.goto('/');
    const message = uniqueText('From a phone');
    await page.getByLabel('Your feedback').tap();
    await page.getByLabel('Your feedback').fill(message);
    await page.getByRole('button', { name: 'Post' }).tap();
    await expect(noteText(page, message)).toBeVisible();
  });
});

test('a very long unbroken word does not break the layout', async ({ page, request }) => {
  await request.post('/api/feedbacks', { data: { name: 'N'.repeat(40), message: 'W'.repeat(280) } });
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await expect(noteText(page, 'W'.repeat(280))).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
