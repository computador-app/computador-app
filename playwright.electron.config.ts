import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests-electron",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  outputDir: "test-results/electron",
});
