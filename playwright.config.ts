import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for SDA Management E2E Tests
 *
 * Two modes:
 * 1. Local development: Full E2E tests against dev server with Convex backend
 * 2. CI pipeline: Build verification only (type check + build) - E2E skipped unless CONVEX_URL available
 *
 * Run locally:
 *   npm run test:e2e          # headless
 *   npm run test:e2e:ui       # interactive UI mode
 *   npm run test:e2e:headed   # headed browser
 */
export default defineConfig({
  testDir: "./tests",

  /* Maximum time a single test can run */
  timeout: 30_000,

  /* Expect timeout for assertions */
  expect: {
    timeout: 10_000,
  },

  /* Run tests sequentially in CI for stability, parallel locally */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry failed tests once in CI, never locally */
  retries: process.env.CI ? 1 : 0,

  /* Single worker in CI for stability */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter: HTML locally, list + GitHub annotations in CI */
  reporter: process.env.CI
    ? [["list"], ["github"], ["html", { open: "never" }]]
    : [["html", { open: "on-failure" }]],

  /* Shared settings for all projects */
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",

    /* Collect trace on first retry for debugging failures */
    trace: "on-first-retry",

    /* Screenshot on failure */
    screenshot: "only-on-failure",

    /* Video on failure in CI */
    video: process.env.CI ? "on-first-retry" : "off",
  },

  /* Test projects */
  projects: [
    /* Auth setup - runs first to create authenticated session state */
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
    },

    /* Main test suite - depends on auth setup for session reuse */
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        /* Reuse authenticated state from setup */
        storageState: "tests/.auth/user.json",
      },
      dependencies: ["auth-setup"],
    },
  ],

  /* Dev server configuration - starts Next.js before tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: "development",
    },
  },
});
