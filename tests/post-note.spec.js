import { test, expect } from '@playwright/test';

test('posting a note shows it on the wall', async ({ page }) => {
  // Unique text so this test never matches another test's note
  const message = `Hello from Playwright ${Date.now()}`;

  await page.goto('/');
  await page.getByLabel('Your name').fill('Tester');
  await page.getByLabel('Your feedback').fill(message);
  await page.getByRole('button', { name: 'Post' }).click();

  // The note arrives through the live stream
  await expect(page.getByText(message)).toBeVisible();
  // The form is cleared after a successful post
  await expect(page.getByLabel('Your feedback')).toHaveValue('');
});

test('a note without a name is posted as Anonymous', async ({ page }) => {
  const message = `No name ${Date.now()}`;

  await page.goto('/');
  await page.getByLabel('Your feedback').fill(message);
  await page.getByRole('button', { name: 'Post' }).click();

  // Find the note tile that contains our message, then check its name chip
  const note = page.locator('.note', { hasText: message });
  await expect(note.locator('.chip')).toHaveText('Anonymous');
  await expect(note.getByText('just now')).toBeVisible();
});
