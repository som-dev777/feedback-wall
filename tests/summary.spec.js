import { test, expect } from '@playwright/test';

// Runs after all other tests (see the "summary" project in playwright.config.js),
// against the fake OpenAI server in tests/mock-openai.js.
test.describe.configure({ mode: 'serial' });

const MOCK = 'http://localhost:3199';

async function postNotes(request, prefix, count) {
  const messages = [];
  for (let i = 1; i <= count; i++) {
    const message = `${prefix} ${i}`;
    await request.post('/api/feedbacks', { data: { name: `Person ${i}`, message } });
    messages.push(message);
  }
  return messages;
}

test('sends exactly the 10 newest notes to OpenAI, newest first', async ({ request }) => {
  const prefix = `Sum-${Date.now()}`;
  const posted = await postNotes(request, prefix, 12);

  const res = await request.post('/api/summary');
  expect(res.status()).toBe(200);

  const last = await (await request.get(`${MOCK}/__last`)).json();
  const sent = JSON.parse(last.body.messages[1].content).map((n) => n.message);
  expect(sent).toEqual(posted.slice(2).reverse()); // notes 12..3, newest first
  expect(last.body.model).toBe('gpt-4.1-nano');
  expect(last.authorization).toBe('Bearer test-key'); // from the test env, not the real .env key
  expect(last.body.response_format.type).toBe('json_schema');
});

test('returns summary, sentiment, themes and note count', async ({ request }) => {
  const prefix = `Shape-${Date.now()}`;
  await postNotes(request, prefix, 1);
  const body = await (await request.post('/api/summary')).json();

  expect(body.summary).toContain(`${prefix} 1`);
  expect(body.noteCount).toBe(10);
  expect(body.sentiment).toEqual({ positive: 7, neutral: 2, negative: 1 });
  expect(body.themes).toEqual([
    { label: 'Live updates', count: 4 },
    { label: 'Design', count: 2 },
    { label: 'Mobile', count: 1 },
  ]);
  expect(new Date(body.generatedAt).toString()).not.toBe('Invalid Date');
});

test('reuses the last summary while no new note has arrived (no extra OpenAI call)', async ({ request }) => {
  await postNotes(request, `Cache-${Date.now()}`, 1);
  await request.post('/api/summary');
  const before = (await (await request.get(`${MOCK}/__calls`)).json()).calls;

  await request.post('/api/summary');
  await request.post('/api/summary');
  expect((await (await request.get(`${MOCK}/__calls`)).json()).calls).toBe(before);

  // A new note means a fresh summary
  await postNotes(request, `Cache-new-${Date.now()}`, 1);
  await request.post('/api/summary');
  expect((await (await request.get(`${MOCK}/__calls`)).json()).calls).toBe(before + 1);
});

test('several clicks at the same moment make only one OpenAI call', async ({ request }) => {
  await postNotes(request, `Burst-${Date.now()}`, 1);
  const before = (await (await request.get(`${MOCK}/__calls`)).json()).calls;

  const results = await Promise.all(Array.from({ length: 5 }, () => request.post('/api/summary')));
  expect(results.map((r) => r.status())).toEqual([200, 200, 200, 200, 200]);
  expect((await (await request.get(`${MOCK}/__calls`)).json()).calls).toBe(before + 1);
});

for (const mode of ['error', 'bad-json']) {
  test(`OpenAI ${mode === 'error' ? 'error' : 'unreadable answer'} gives a friendly 502`, async ({ request }) => {
    await postNotes(request, `Fail-${mode}-${Date.now()}`, 1);
    await request.post(`${MOCK}/__fail-next?mode=${mode}`);

    const res = await request.post('/api/summary');
    expect(res.status()).toBe(502);
    expect(await res.json()).toEqual({ error: 'Could not get a summary right now. Please try again.' });
  });
}

test('clicking Summarize shows the summary with sentiment and theme visuals', async ({ page, request }) => {
  const prefix = `UI-${Date.now()}`;
  await postNotes(request, prefix, 1);
  await page.goto('/');

  const panel = page.getByRole('region', { name: 'AI summary' });
  await expect(panel.getByText('Summarize the 10 most recent notes.')).toBeVisible();
  await panel.getByRole('button', { name: 'Summarize' }).click();

  await expect(panel.getByText(`Mock summary of 10 notes. Newest says: ${prefix} 1`)).toBeVisible();
  await expect(panel.getByText(/Based on the 10 most recent notes/)).toBeVisible();

  // Sentiment: bar segments sized by count, legend with numbers
  await expect(panel.getByRole('img', { name: '7 positive, 2 neutral, 1 negative' })).toBeVisible();
  await expect(panel.locator('[data-sentiment="positive"]')).toHaveText('Positive 7');
  await expect(panel.locator('[data-sentiment="negative"]')).toHaveText('Negative 1');
  const widths = await panel.locator('.sentiment-bar span').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
  expect(widths[0]).toBeGreaterThan(widths[1]); // 7 positive wider than 2 neutral
  expect(widths[1]).toBeGreaterThan(widths[2]); // 2 neutral wider than 1 negative

  // Themes: labels, counts and proportional bars
  await expect(panel.locator('.theme-label')).toHaveText(['Live updates', 'Design', 'Mobile']);
  await expect(panel.locator('.theme-count')).toHaveText(['4', '2', '1']);
  await expect(panel.locator('.theme-fill').first()).toHaveAttribute('style', /width: 100%/);

  await expect(panel.getByRole('button', { name: 'Refresh' })).toBeEnabled();
});

test('summary text from the AI is shown as plain text', async ({ page, request }) => {
  // The mock repeats the newest note inside the summary
  const message = `<img src=x onerror="window.__hacked = true"> ${Date.now()}`;
  await request.post('/api/feedbacks', { data: { message } });
  await page.goto('/');

  const panel = page.getByRole('region', { name: 'AI summary' });
  await panel.getByRole('button', { name: 'Summarize' }).click();
  await expect(panel.locator('.summary-text')).toContainText(message);
  await expect(panel.locator('.summary-text img')).toHaveCount(0);
  expect(await page.evaluate(() => window.__hacked)).toBeUndefined();
});

test.describe('UI states (faked responses)', () => {
  test('shows "Summarizing..." while waiting', async ({ page }) => {
    let release;
    const held = new Promise((r) => (release = r));
    await page.route('**/api/summary', async (route) => {
      await held;
      return route.continue();
    });
    await page.goto('/');
    const panel = page.getByRole('region', { name: 'AI summary' });
    await panel.getByRole('button', { name: 'Summarize' }).click();

    await expect(panel.getByRole('button', { name: 'Summarizing...' })).toBeDisabled();
    release();
    await expect(panel.locator('.summary-text')).toBeVisible();
  });

  test('server error is shown and the button works again', async ({ page }) => {
    await page.route('**/api/summary', (route) =>
      route.fulfill({ status: 502, json: { error: 'Could not get a summary right now. Please try again.' } }),
    );
    await page.goto('/');
    const panel = page.getByRole('region', { name: 'AI summary' });
    await panel.getByRole('button', { name: 'Summarize' }).click();

    await expect(panel.getByText('Could not get a summary right now. Please try again.')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Summarize' })).toBeEnabled();
  });

  test('summaries switched off on the server shows that message', async ({ page }) => {
    await page.route('**/api/summary', (route) =>
      route.fulfill({ status: 503, json: { error: 'Summaries are not set up on this server' } }),
    );
    await page.goto('/');
    const panel = page.getByRole('region', { name: 'AI summary' });
    await panel.getByRole('button', { name: 'Summarize' }).click();
    await expect(panel.getByText('Summaries are not set up on this server')).toBeVisible();
  });

  test('button is disabled on an empty wall', async ({ page }) => {
    await page.route('**/api/feedbacks/stream', (route) => route.abort());
    await page.route('**/api/feedbacks', (route) => route.fulfill({ json: [] }));
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'AI summary' }).getByRole('button', { name: 'Summarize' })).toBeDisabled();
  });
});
