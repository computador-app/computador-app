import { defineConfig, devices } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT ?? '5173';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testMatch: "**/*.spec.ts",
  testDir: './tests',
  fullyParallel: true,
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  expect: {
    timeout: 8_000,
    toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.08 },
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1480, height: 960 } } }],
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
