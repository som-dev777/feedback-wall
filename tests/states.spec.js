import { test, expect } from '@playwright/test';

// These tests fake the list, so also cut the live stream:
// otherwise notes posted by tests running in parallel would arrive and change the wall.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/feedbacks/stream', (route) => route.abort());
});

// These tests fake the server's answers with page.route, so they can show
// states that are hard to reach with a real server (empty wall, server down).
// The pattern '**/api/feedbacks' matches the list/post URL but not '/stream'.

test('empty wall shows a friendly message', async ({ page }) => {
  await page.route('**/api/feedbacks', (route) => route.fulfill({ json: [] }));
  await page.goto('/');

  await expect(page.getByText('No feedback yet. Be the first!')).toBeVisible();
  await expect(page.getByText('0 notes')).toBeVisible();
});

test('failed load shows an error message', async ({ page }) => {
  await page.route('**/api/feedbacks', (route) => route.abort());
  await page.goto('/');

  await expect(page.getByText('Could not load feedback. Is the server running?')).toBeVisible();
});

test('server error on post is shown under the form and keeps the text', async ({ page }) => {
  await page.route('**/api/feedbacks', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 400, json: { error: 'Message cannot be empty' } });
    }
    return route.continue();
  });
  await page.goto('/');

  await page.getByLabel('Your feedback').fill('This will fail');
  await page.getByRole('button', { name: 'Post' }).click();

  await expect(page.getByText('Message cannot be empty')).toBeVisible();
  // The user's text is not lost
  await expect(page.getByLabel('Your feedback')).toHaveValue('This will fail');
});

test('unreachable server on post shows "Could not reach the server"', async ({ page }) => {
  await page.route('**/api/feedbacks', (route) =>
    route.request().method() === 'POST' ? route.abort() : route.continue(),
  );
  await page.goto('/');

  await page.getByLabel('Your feedback').fill('Server is down');
  await page.getByRole('button', { name: 'Post' }).click();

  await expect(page.getByText('Could not reach the server')).toBeVisible();
});

test('Post button shows "Posting..." and is disabled while sending', async ({ page }) => {
  let releasePost;
  const postHeld = new Promise((resolve) => (releasePost = resolve));

  await page.route('**/api/feedbacks', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await postHeld; // hold the request until the test has checked the button
    return route.continue();
  });
  await page.goto('/');

  await page.getByLabel('Your feedback').fill(`Slow post ${Date.now()}`);
  await page.getByRole('button', { name: 'Post' }).click();

  const button = page.getByRole('button', { name: 'Posting...' });
  await expect(button).toBeVisible();
  await expect(button).toBeDisabled();

  releasePost();
  await expect(page.getByRole('button', { name: 'Post' })).toBeVisible();
});
