import { test, expect } from '@playwright/test';
import { metric, openWall } from './helpers.js';

const BASE = 'http://localhost:3200';

// Open a raw live-stream connection from the test process (no browser).
// Returns once connected; `done` resolves when `count` notes carrying `tag` have arrived.
// (Wrapped in an object: returning the promise itself would make callers wait for it.)
async function rawStream(tag, count) {
  const controller = new AbortController();
  const res = await fetch(`${BASE}/api/feedbacks/stream`, { signal: controller.signal });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const done = (async () => {
    let seen = 0;
    let buffer = '';
    while (seen < count) {
      const { value } = await reader.read();
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      seen += lines.filter((l) => l.startsWith('data:') && l.includes(tag)).length;
    }
    controller.abort();
  })();
  return { done };
}

test('server delivers a burst of 50 posts to 100 connected viewers', async ({ request }) => {
  const tag = `Fanout-${Date.now()}`;
  const viewers = await Promise.all(Array.from({ length: 100 }, () => rawStream(tag, 50)));

  const start = Date.now();
  const results = await Promise.all(
    Array.from({ length: 50 }, (_, i) => request.post('/api/feedbacks', { data: { message: `${tag} #${i}` } })),
  );
  expect(results.every((r) => r.status() === 201)).toBe(true);
  await Promise.all(viewers.map((v) => v.done));
  metric('Server delivered 50 notes to 100 viewers', Date.now() - start, 'ms', 1000);
});

// 20 real browsers on one machine. All 20 tabs share ONE CPU here, so this is a
// stress check that every wall ends up correct, not a per-user speed figure.
test('20 open browsers all end up showing a burst of 50 posts', async ({ browser, request }) => {
  const contexts = [];
  const pages = [];
  for (let i = 0; i < 20; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await openWall(page);
    contexts.push(context);
    pages.push(page);
  }

  const tag = `Crowd-${Date.now()}`;
  const start = Date.now();
  const results = await Promise.all(
    Array.from({ length: 50 }, (_, i) => request.post('/api/feedbacks', { data: { message: `${tag} #${i}` } })),
  );
  expect(results.every((r) => r.status() === 201)).toBe(true);

  // Every wall must show all 50, each exactly once
  await Promise.all(
    pages.map((page) =>
      expect(page.locator('.note-message', { hasText: tag })).toHaveCount(50, { timeout: 60_000 }),
    ),
  );
  metric('All 20 walls rendered (one shared CPU)', Date.now() - start, 'ms', 60000);

  await Promise.all(contexts.map((c) => c.close()));
});
