import { test, expect } from '@playwright/test';

// Record a measured value against a budget.
// The value is attached to the test (shown in the report) and checked with a
// soft assertion, so every metric is collected even if one is over budget.
export function metric(name, value, unit, budget) {
  const rounded = Math.round(value * 100) / 100;
  test.info().annotations.push({
    type: 'metric',
    description: JSON.stringify({ name, value: rounded, unit, budget }),
  });
  console.log(`  ${name}: ${rounded} ${unit} (budget ≤ ${budget} ${unit})`);
  expect.soft(rounded, `${name} should be within budget`).toBeLessThanOrEqual(budget);
}

export function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

// Open the wall and wait until the live stream is connected
export async function openWall(page) {
  const streamReady = page.waitForResponse('**/api/feedbacks/stream');
  await page.goto('/');
  await streamReady;
}

export function uniqueText(label) {
  return `${label} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// The note tile's text (not the textarea, which holds the same text until the post completes)
export function noteText(page, message) {
  return page.locator('.note-message', { hasText: message });
}
