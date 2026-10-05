import { test, expect } from '@playwright/test';

// These tests call the API directly (no browser page) to check server-side validation

test('valid post returns 201 and the created note', async ({ request }) => {
  const message = `API ${Date.now()}`;
  const res = await request.post('/api/feedbacks', {
    data: { name: '  Tester  ', message: `  ${message}  ` },
  });

  expect(res.status()).toBe(201);
  const note = await res.json();
  expect(note.id).toEqual(expect.any(Number));
  expect(note.name).toBe('Tester'); // trimmed
  expect(note.message).toBe(message); // trimmed
  expect(note.created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});

test('blank name becomes Anonymous', async ({ request }) => {
  const res = await request.post('/api/feedbacks', {
    data: { name: '   ', message: `Blank name ${Date.now()}` },
  });
  expect(res.status()).toBe(201);
  expect((await res.json()).name).toBe('Anonymous');
});

// Each bad request should be rejected with 400 and an error message
const badRequests = [
  { title: 'missing message', data: { name: 'X' } },
  { title: 'empty message', data: { message: '   ' } },
  { title: 'message over 280 characters', data: { message: 'a'.repeat(281) } },
  { title: 'message that is not text', data: { message: 123 } },
  { title: 'name over 40 characters', data: { name: 'n'.repeat(41), message: 'x' } },
  { title: 'name that is not text', data: { name: 5, message: 'x' } },
];

for (const { title, data } of badRequests) {
  test(`rejects ${title}`, async ({ request }) => {
    const res = await request.post('/api/feedbacks', { data });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toEqual(expect.any(String));
  });
}

test('rejects invalid JSON', async ({ request }) => {
  const res = await request.post('/api/feedbacks', {
    headers: { 'Content-Type': 'application/json' },
    data: '{bad json',
  });
  expect(res.status()).toBe(400);
  expect(await res.json()).toEqual({ error: 'Invalid JSON body' });
});

test('list returns notes newest first', async ({ request }) => {
  const first = await (await request.post('/api/feedbacks', { data: { message: `Older ${Date.now()}` } })).json();
  const second = await (await request.post('/api/feedbacks', { data: { message: `Newer ${Date.now()}` } })).json();

  const res = await request.get('/api/feedbacks');
  expect(res.status()).toBe(200);
  const ids = (await res.json()).map((n) => n.id);
  // Other tests may add notes in parallel, so compare positions rather than exact contents
  expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
});

test('rejects an oversized request body with 413', async ({ request }) => {
  const res = await request.post('/api/feedbacks', {
    data: { message: 'a'.repeat(200_000) }, // ~200 KB, over Express's 100 KB limit
  });
  expect(res.status()).toBe(413);
  expect(await res.json()).toEqual({ error: 'Request body is too large' });
});
