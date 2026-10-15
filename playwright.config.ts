import { defineConfig, devices } from "@playwright/test";

// Runs against the test build (npm run build:e2e), served like production.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : "line",
  use: { baseURL: "http://127.0.0.1:4400", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "node scripts/serve.mjs dist-e2e 4400", url: "http://127.0.0.1:4400", reuseExistingServer: !process.env.CI },
});
