// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Tests run against a separate test server so they never touch your real notes:
 * Express on port 3100 serves the built client + API, with a throwaway DB in .test-data/.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'html',
  use: {
    // page.goto('/') opens this address
    baseURL: 'http://localhost:3100',
    // Keep a step-by-step recording when a test fails (open it from the report)
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /summary\.spec\.js/,
    },
    {
      // Summary tests need "the 10 newest notes" to be stable, so they run
      // after all other tests have finished posting
      name: 'summary',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /summary\.spec\.js/,
      dependencies: ['chromium'],
    },
  ],
  webServer: [
    {
      // Fake OpenAI, so tests never spend money or use the real key
      command: 'node tests/mock-openai.js',
      url: 'http://localhost:3199/__calls',
      reuseExistingServer: false,
    },
    {
      // Fresh DB -> build the React app -> start Express serving API + client
      command:
        'rm -rf .test-data && npm run build --prefix client && PORT=3100 DATA_DIR=.test-data node server/index.js',
      url: 'http://localhost:3100/api/feedbacks',
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        OPENAI_API_KEY: 'test-key',
        OPENAI_BASE_URL: 'http://localhost:3199/v1',
      },
    },
  ],
});
