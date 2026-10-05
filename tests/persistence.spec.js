import { test, expect } from '@playwright/test';

test('notes are still there after a reload', async ({ page }) => {
  const message = `Persist ${Date.now()}`;

  await page.goto('/');
  await page.getByLabel('Your feedback').fill(message);
  await page.getByRole('button', { name: 'Post' }).click();
  await expect(page.getByText(message)).toBeVisible();

  await page.reload();
  await expect(page.getByText(message)).toBeVisible();
});

test('a fresh page load shows existing notes newest first', async ({ page, request }) => {
  const older = `Load older ${Date.now()}`;
  const newer = `Load newer ${Date.now()}`;
  await request.post('/api/feedbacks', { data: { message: older } });
  await request.post('/api/feedbacks', { data: { message: newer } });

  await page.goto('/');
  await expect(page.getByText(newer)).toBeVisible();

  const texts = await page.locator('.note-message').allTextContents();
  expect(texts.indexOf(older)).toBeGreaterThan(-1);
  expect(texts.indexOf(newer)).toBeLessThan(texts.indexOf(older));
});
