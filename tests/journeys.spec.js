import { test, expect } from '@playwright/test';

// Real-world use cases beyond the basic post flow

const noteText = (page, text) => page.locator('.note-message', { hasText: text });

async function openWall(page) {
  const streamReady = page.waitForResponse('**/api/feedbacks/stream');
  await page.goto('/');
  await streamReady;
}

test('typing the next note while the last one is still sending does not lose text', async ({ page }) => {
  // Hold the server's reply to the first post. The note itself still arrives
  // through the live stream, which is exactly when a user starts typing again.
  let releaseReply;
  const replyHeld = new Promise((resolve) => (releaseReply = resolve));
  await page.route('**/api/feedbacks', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch();
    await replyHeld;
    return route.fulfill({ response });
  });
  await openWall(page);

  const first = `First ${Date.now()}`;
  await page.getByLabel('Your feedback').fill(first);
  await page.getByRole('button', { name: 'Post' }).click();
  await expect(noteText(page, first)).toBeVisible();

  await page.getByLabel('Your feedback').fill('My next note');
  releaseReply();
  await expect(page.getByRole('button', { name: 'Post' })).toBeVisible();

  await expect(page.getByLabel('Your feedback')).toHaveValue('My next note');
});

test('three people taking turns all see the same notes in the same order', async ({ browser }) => {
  const people = [];
  for (const name of ['Asha', 'Ben', 'Chen']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await openWall(page);
    people.push({ name, page, context });
  }

  // Unique tag so no other test's note can match
  const stamp = `turns-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  for (const { name, page } of people) {
    const message = `${name} says hi ${stamp}`;
    await page.getByLabel('Your name').fill(name);
    await page.getByLabel('Your feedback').fill(message);
    await page.getByRole('button', { name: 'Post' }).click();
    await expect(noteText(page, message)).toBeVisible();
  }

  const expected = ['Chen', 'Ben', 'Asha'].map((n) => `${n} says hi ${stamp}`);
  for (const { page } of people) {
    await expect(page.locator('.note-message', { hasText: stamp })).toHaveText(expected);
  }
  for (const { context } of people) await context.close();
});

test('Hindi, emoji and accented text are shown exactly', async ({ page }) => {
  const name = 'सोमनाथ 🙂';
  const message = `बहुत बढ़िया! Café ✨🎉 ${Date.now()}`;
  await openWall(page);

  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Your feedback').fill(message);
  await page.getByRole('button', { name: 'Post' }).click();

  const note = page.locator('.note', { hasText: message });
  await expect(note.locator('.note-message')).toHaveText(message);
  await expect(note.locator('.chip')).toHaveText(name);
});

test('emoji count the same in the form and on the server (280 limit)', async ({ page, request }) => {
  // Each of these emoji is 2 JavaScript characters, so 140 of them = 280
  await page.goto('/');
  await page.getByLabel('Your feedback').fill('😀'.repeat(140));
  await expect(page.getByText('280/280')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Post' })).toBeEnabled();
  expect((await request.post('/api/feedbacks', { data: { message: '😀'.repeat(140) } })).status()).toBe(201);

  await page.getByLabel('Your feedback').fill('😀'.repeat(141));
  await expect(page.getByRole('button', { name: 'Post' })).toBeDisabled();
  expect((await request.post('/api/feedbacks', { data: { message: '😀'.repeat(141) } })).status()).toBe(400);
});

test('double-clicking Post creates only one note', async ({ page, request }) => {
  const message = `Double click ${Date.now()}`;
  await openWall(page);

  await page.getByLabel('Your feedback').fill(message);
  await page.getByRole('button', { name: 'Post' }).dblclick();
  await expect(noteText(page, message)).toBeVisible();

  const all = await (await request.get('/api/feedbacks')).json();
  expect(all.filter((n) => n.message === message)).toHaveLength(1);
  await expect(noteText(page, message)).toHaveCount(1);
});

test('Enter in the message box adds a new line instead of posting', async ({ page }) => {
  await page.goto('/');
  const box = page.getByLabel('Your feedback');
  await box.fill('line one');
  await box.press('Enter');
  await box.pressSequentially('line two');
  await expect(box).toHaveValue('line one\nline two');
});

test('relative time moves on while the page stays open', async ({ page }) => {
  await page.clock.install();
  await openWall(page);

  const message = `Clock ${Date.now()}`;
  await page.getByLabel('Your feedback').fill(message);
  await page.getByRole('button', { name: 'Post' }).click();
  const time = page.locator('.note', { hasText: message }).locator('.note-time');
  await expect(time).toHaveText('just now');

  await page.clock.fastForward('02:05'); // 2 min 5 s later
  await expect(time).toHaveText('2 min ago');

  await page.clock.fastForward('01:00:00');
  await expect(time).toHaveText('1 h ago');
});

test('SQL-looking text is saved and shown as plain text', async ({ page, request }) => {
  const message = `Robert'); DROP TABLE feedbacks;-- ${Date.now()}`;
  const res = await request.post('/api/feedbacks', { data: { name: "' OR '1'='1", message } });
  expect(res.status()).toBe(201);

  await page.goto('/');
  const note = page.locator('.note', { hasText: message });
  await expect(note.locator('.note-message')).toHaveText(message);
  await expect(note.locator('.chip')).toHaveText("' OR '1'='1");
  // The table is still there and still answering
  expect((await request.get('/api/feedbacks')).status()).toBe(200);
});
