import { test, expect } from '@playwright/test';
import { metric, percentile } from './helpers.js';

// One round: 200 posts fired at the same moment
async function burst(request, round) {
  const timings = [];
  const statuses = await Promise.all(
    Array.from({ length: 200 }, async (_, i) => {
      const start = Date.now();
      const res = await request.post('/api/feedbacks', { data: { name: 'Load', message: `Burst ${round}-${i}` } });
      timings.push(Date.now() - start);
      return res.status();
    }),
  );
  expect(statuses.filter((s) => s !== 201)).toEqual([]);
  return { p50: percentile(timings, 50), p95: percentile(timings, 95) };
}

test('200 posts sent at the same time all succeed quickly', async ({ request }) => {
  // Three rounds; report the middle one so a single busy moment on the machine doesn't skew it
  const rounds = [await burst(request, 1), await burst(request, 2), await burst(request, 3)];
  rounds.sort((a, b) => a.p50 - b.p50);
  console.log(`  (round medians: ${rounds.map((r) => r.p50).join(', ')} ms)`);

  metric('Concurrent POST latency (median)', rounds[1].p50, 'ms', 250);
  metric('Concurrent POST latency (p95)', rounds[1].p95, 'ms', 500);
});

test('reading the full list stays fast', async ({ request }) => {
  const timings = [];
  let count = 0;
  for (let i = 0; i < 10; i++) {
    const start = Date.now();
    const res = await request.get('/api/feedbacks');
    timings.push(Date.now() - start);
    expect(res.status()).toBe(200);
    count = (await res.json()).length;
  }
  console.log(`  (list size: ${count} notes)`);
  metric('GET /api/feedbacks (p95)', percentile(timings, 95), 'ms', 200);
});
