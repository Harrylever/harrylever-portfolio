import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

import { fakeCloudinaryServerEnv } from "./tests/e2e/helpers/cloudinary-fake";

// Same env files as the app (ADMIN_* credentials for the sign-in helper,
// and TEST_DATABASE_URL_UNPOOLED, which database-writing specs require).
loadEnvConfig(process.cwd());

// Admin E2E writes to the separate local test database. Point both the dev
// server Playwright starts and the helpers in this process (and its workers,
// which re-evaluate this file) at TEST_DATABASE_URL_UNPOOLED, so the
// development database in .env.local is never touched. The helpers'
// assertSafeE2ETarget/assertSafeTestDatabase refuse production targets.
const testDatabaseUrl = process.env.TEST_DATABASE_URL_UNPOOLED?.trim();
const testDatabaseEnv: Record<string, string> = testDatabaseUrl
  ? { DATABASE_URL: testDatabaseUrl, DATABASE_URL_UNPOOLED: testDatabaseUrl }
  : {};

Object.assign(process.env, testDatabaseEnv);

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  // The login limiter is per server process; keep runs serial so the
  // invalid-login test cannot throttle the others.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `bun run dev --port ${port}`,
        url: `${baseURL}/admin/sign-in`,
        // A server that is already running may have been started with a
        // different env (another database). Only reuse one on request.
        reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
        timeout: 180_000,
        // Media E2E never talks to a real Cloudinary account: these fake
        // values override any CLOUDINARY_* in .env.local for the test server.
        env: { ...fakeCloudinaryServerEnv(), ...testDatabaseEnv },
      },
});
