import { test, expect } from '@playwright/test';
import { metric, uniqueText, noteText } from './helpers.js';

test('a keyboard-only user can post a note', async ({ page }) => {
  await page.goto('/');
  const message = uniqueText('Keyboard only');

  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Your name')).toBeFocused();
  await page.keyboard.type('Keys');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Your feedback')).toBeFocused();
  await page.keyboard.type(message);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Post' })).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(noteText(page, message)).toBeVisible();
});

test('page basics: language, title, labelled controls, one main heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('Feedback Wall');
  await expect(page.getByRole('textbox', { name: 'Your name' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your feedback' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Post' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('main')).toBeVisible();
});

test('keyboard focus is visible on every control', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Your feedback').fill('x'); // enable the button so it can take focus

  for (const name of ['Your name', 'Your feedback']) {
    await page.getByLabel(name).focus();
    await expect(page.getByLabel(name)).toHaveCSS('border-color', 'rgb(212, 255, 58)');
  }
  await page.keyboard.press('Tab'); // from the textarea to the button
  const button = page.getByRole('button', { name: 'Post' });
  await expect(button).toBeFocused();
  const outline = await button.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline, 'Post button needs a visible focus outline').not.toBe('none');
});

// WCAG 2.1 contrast ratio between two CSS colours
function contrast(fg, bg) {
  const lum = (rgb) => {
    const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map((v) => {
      const c = Number(v) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

test('text colour contrast meets WCAG AA (4.5:1)', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Your feedback').fill('Hi');
  await expect(page.locator('.note').first()).toBeVisible();

  const samples = [
    ['Note message', '.note-message', '.note'],
    ['Name chip', '.chip', '.chip'],
    ['Note time', '.note-time', '.note'],
    ['Tagline', '.tagline', '.sidebar'],
    ['Character counter', '.counter', '.sidebar'],
    ['Top bar status', '.status', '.topbar'],
    ['Hero headline', '.hero-text', '.hero'],
  ];

  const failures = [];
  for (const [label, textSel, bgSel] of samples) {
    const fg = await page.locator(textSel).first().evaluate((el) => getComputedStyle(el).color);
    const bg = await page.locator(bgSel).first().evaluate((el) => getComputedStyle(el).backgroundColor);
    const ratio = Math.round(contrast(fg, bg) * 100) / 100;
    test.info().annotations.push({
      type: 'metric',
      description: JSON.stringify({ name: `Contrast: ${label}`, value: ratio, unit: ':1 (min)', budget: 4.5, higherIsBetter: true }),
    });
    console.log(`  Contrast ${label}: ${ratio}:1`);
    if (ratio < 4.5) failures.push(`${label} ${ratio}:1`);
  }
  expect(failures, 'text below WCAG AA contrast').toEqual([]);
});
