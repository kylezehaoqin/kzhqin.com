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
  webServer: [
    // Static server for most tests, proxying /presence to presence server A (like Caddy).
    { command: "node scripts/serve.mjs dist-e2e 4400", env: { PRESENCE_URL: "http://127.0.0.1:8091" }, url: "http://127.0.0.1:4400", reuseExistingServer: !process.env.CI },
    { command: "node presence/server.mjs", env: { PORT: "8091", MAX_PER_IP: "1000", ALLOWED_ORIGINS: "http://127.0.0.1:4400" }, url: "http://127.0.0.1:8091/presence/healthz", reuseExistingServer: !process.env.CI },
    // A separate pair for the presence tests, so parallel tests do not change the counts.
    { command: "node scripts/serve.mjs dist-e2e 4401", env: { PRESENCE_URL: "http://127.0.0.1:8092" }, url: "http://127.0.0.1:4401", reuseExistingServer: !process.env.CI },
    { command: "node presence/server.mjs", env: { PORT: "8092", MAX_PER_IP: "1000", ALLOWED_ORIGINS: "http://127.0.0.1:4401" }, url: "http://127.0.0.1:8092/presence/healthz", reuseExistingServer: !process.env.CI },
    // No presence service behind this one: the "service down" case.
    { command: "node scripts/serve.mjs dist-e2e 4402", url: "http://127.0.0.1:4402", reuseExistingServer: !process.env.CI },
  ],
});
