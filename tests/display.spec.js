import { test, expect } from '@playwright/test';

// These tests fake the list, so also cut the live stream:
// otherwise notes posted by tests running in parallel would arrive and change the wall.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/feedbacks/stream', (route) => route.abort());
});

// Build a created_at string the way the server does: UTC, "YYYY-MM-DD HH:MM:SS"
function utcMinutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString().replace('T', ' ').slice(0, 19);
}

function fakeNote(id, minutesAgo) {
  return { id, name: `Person ${id}`, message: `Message ${id}`, created_at: utcMinutesAgo(minutesAgo) };
}

test('relative times are worked out from UTC timestamps', async ({ page }) => {
  await page.route('**/api/feedbacks', (route) =>
    route.fulfill({
      json: [fakeNote(1, 0), fakeNote(2, 5), fakeNote(3, 120), fakeNote(4, 3 * 24 * 60)],
    }),
  );
  await page.goto('/');

  const timeOf = (id) => page.locator('.note', { hasText: `Message ${id}` }).locator('.note-time');
  await expect(timeOf(1)).toHaveText('just now');
  await expect(timeOf(2)).toHaveText('5 min ago');
  await expect(timeOf(3)).toHaveText('2 h ago');
  await expect(timeOf(4)).toHaveText('3 d ago');
});

test('top bar counts the notes', async ({ page }) => {
  await page.route('**/api/feedbacks', (route) => route.fulfill({ json: [fakeNote(1, 0)] }));
  await page.goto('/');
  await expect(page.getByText('1 note', { exact: true })).toBeVisible();

  await page.unroute('**/api/feedbacks');
  await page.route('**/api/feedbacks', (route) =>
    route.fulfill({ json: [fakeNote(1, 0), fakeNote(2, 1)] }),
  );
  await page.reload();
  await expect(page.getByText('2 notes', { exact: true })).toBeVisible();
});

test('each note gets a stable accent colour from its id', async ({ page }) => {
  await page.route('**/api/feedbacks', (route) =>
    route.fulfill({ json: [fakeNote(5, 0), fakeNote(6, 0)] }),
  );
  await page.goto('/');

  const dot = (id) => page.locator('.note', { hasText: `Message ${id}` }).locator('.chip .dot');
  // Palette in StickyNote.jsx: index = id % 5 → id 5 = lime, id 6 = yellow
  await expect(dot(5)).toHaveCSS('background-color', 'rgb(212, 255, 58)');
  await expect(dot(6)).toHaveCSS('background-color', 'rgb(255, 225, 77)');
});
