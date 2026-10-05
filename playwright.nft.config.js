// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Non-functional tests (performance, load, network, responsive, accessibility, stability).
 * Own server on port 3200 with its own throwaway DB in .test-data-nft/.
 * One worker so timings are not skewed by other tests running at the same time.
 */
export default defineConfig({
  testDir: './tests-nft',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  reporter: [['list'], ['json', { outputFile: 'nft-results/results.json' }]],
  use: {
    baseURL: 'http://localhost:3200',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command:
      'rm -rf .test-data-nft && npm run build --prefix client && PORT=3200 DATA_DIR=.test-data-nft node server/index.js',
    url: 'http://localhost:3200/api/feedbacks',
    reuseExistingServer: false,
    timeout: 60_000,
    // Summaries switched off: NFT runs must never call the real OpenAI API
    env: { OPENAI_API_KEY: '' },
  },
});
