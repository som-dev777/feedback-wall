import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Post is disabled until there is a real message', async ({ page }) => {
  const post = page.getByRole('button', { name: 'Post' });
  const feedback = page.getByLabel('Your feedback');

  await expect(post).toBeDisabled();

  await feedback.fill('     ');
  await expect(post).toBeDisabled();

  await feedback.fill('Hello');
  await expect(post).toBeEnabled();
});

test('counter shows the message length', async ({ page }) => {
  await page.getByLabel('Your feedback').fill('Hello');
  await expect(page.getByText('5/280')).toBeVisible();
});

test('more than 280 characters disables Post and turns the counter red', async ({ page }) => {
  await page.getByLabel('Your feedback').fill('a'.repeat(281));

  await expect(page.getByRole('button', { name: 'Post' })).toBeDisabled();
  const counter = page.getByText('281/280');
  await expect(counter).toHaveClass(/over/);
  await expect(counter).toHaveCSS('color', 'rgb(255, 92, 92)');
});

test('exactly 280 characters is allowed', async ({ page }) => {
  await page.getByLabel('Your feedback').fill('a'.repeat(280));
  await expect(page.getByRole('button', { name: 'Post' })).toBeEnabled();
});

test('name box stops at 40 characters', async ({ page }) => {
  const name = page.getByLabel('Your name');
  // fill() bypasses maxlength, so type like a real user
  await name.pressSequentially('n'.repeat(45));
  await expect(name).toHaveValue('n'.repeat(40));
});
