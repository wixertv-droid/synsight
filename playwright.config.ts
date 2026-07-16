import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://127.0.0.1:3000",
    // Only reuse when explicitly requested — a stale process on :3000 breaks auth e2e.
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE === "true",
    timeout: 180_000,
    env: {
      ...process.env,
      NODE_ENV: "production",
      APP_URL: "http://127.0.0.1:3000",
      SESSION_SECRET:
        process.env.SESSION_SECRET ?? "playwright-e2e-session-secret-32chars!",
      ALLOW_DEV_AUTH: "false",
      EMAIL_DELIVERY_MODE: "log-link",
      ALLOW_PUBLIC_REGISTRATION: "true",
      AUTO_VERIFY_EMAIL: "true",
      CSRF_STRICT: "false",
      REQUIRE_DATABASE: "false",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
