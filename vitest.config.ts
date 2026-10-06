import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/**/*.test.{ts,tsx}"],
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage/frontend",
      thresholds: {
        lines: 33,
        branches: 23,
        functions: 28,
        statements: 33,
      },
    },
  },
});
