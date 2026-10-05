import { test, expect } from '@playwright/test';

test('HTML in a message is shown as plain text, not run', async ({ page, request }) => {
  const message = `<b>bold?</b> <img src=x onerror="window.__hacked = true"> ${Date.now()}`;
  await request.post('/api/feedbacks', { data: { name: '<i>Mallory</i>', message } });

  await page.goto('/');
  const note = page.locator('.note', { hasText: message });

  // The tags appear literally on screen...
  await expect(note.locator('.note-message')).toHaveText(message);
  await expect(note.locator('.chip')).toHaveText('<i>Mallory</i>');
  // ...and no real elements were created from them
  await expect(note.locator('b, img, i')).toHaveCount(0);
  expect(await page.evaluate(() => window.__hacked)).toBeUndefined();
});

test('line breaks in a message are kept', async ({ page, request }) => {
  const stamp = Date.now();
  const message = `line one ${stamp}\nline two`;
  await request.post('/api/feedbacks', { data: { message } });

  await page.goto('/');
  const text = page.locator('.note-message', { hasText: `line one ${stamp}` });

  await expect(text).toHaveCSS('white-space', 'pre-wrap');
  expect(await text.evaluate((el) => el.innerText)).toBe(message);
});
