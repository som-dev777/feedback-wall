import { test, expect } from '@playwright/test';

// Open the wall and wait until its live stream is connected.
// The server sends the stream's headers only after it has registered the client,
// so once this response arrives, the page is guaranteed to receive new notes.
async function openWall(page) {
  const streamReady = page.waitForResponse('**/api/feedbacks/stream');
  await page.goto('/');
  await streamReady;
}

test('a note posted in one browser appears live in another', async ({ browser }) => {
  // Two separate contexts behave like two different people
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const userA = await contextA.newPage();
  const userB = await contextB.newPage();
  await openWall(userA);
  await openWall(userB);

  const message = `Live ${Date.now()}`;
  await userA.getByLabel('Your feedback').fill(message);
  await userA.getByRole('button', { name: 'Post' }).click();

  // User B never reloads, the note arrives through the stream
  await expect(userB.getByText(message)).toBeVisible();
  // The poster sees their note exactly once (no duplicate from POST + stream)
  await expect(userA.getByText(message)).toHaveCount(1);

  await contextA.close();
  await contextB.close();
});

test('notes posted by someone else appear on top, newest first', async ({ page, request }) => {
  await openWall(page);

  const older = `Live older ${Date.now()}`;
  const newer = `Live newer ${Date.now()}`;
  await request.post('/api/feedbacks', { data: { message: older } });
  await request.post('/api/feedbacks', { data: { message: newer } });

  await expect(page.getByText(newer)).toBeVisible();
  await expect(page.getByText(older)).toBeVisible();

  // Other tests may post in parallel, so compare positions rather than exact contents
  const texts = await page.locator('.note-message').allTextContents();
  expect(texts.indexOf(newer)).toBeLessThan(texts.indexOf(older));
});
