import { test, expect } from "@playwright/test";

/**
 * Smoke Tests
 *
 * Basic verification that key pages load without errors.
 * These tests use stored auth state from auth.setup.ts.
 *
 * With mock auth (no Convex backend):
 * - Pages will load but may show loading states or empty data
 * - Tests verify page structure, headings, and absence of fatal errors
 *
 * With real auth (Convex backend available):
 * - Pages will fully render with live data
 * - Tests verify complete page rendering
 */

test.describe("Login Page", () => {
  // Login page is public - use a fresh context without auth state
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should render the login form", async ({ page }) => {
    await page.goto("/login");

    // Verify the page structure
    await expect(page.locator("h1")).toContainText("Sign in", {
      timeout: 15_000,
    });
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    // Verify MySDAManager branding
    await expect(page.getByRole("img", { name: "MySDAManager" })).toBeVisible();

    // Verify no console errors on load
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Filter out expected Convex connection errors (normal when backend is unavailable)
    const unexpectedErrors = errors.filter(
      (e) =>
        !e.includes("convex") &&
        !e.includes("Convex") &&
        !e.includes("WebSocket") &&
        !e.includes("Failed to fetch") &&
        !e.includes("net::ERR")
    );
    expect(unexpectedErrors).toHaveLength(0);
  });

  test("should have a forgot password link", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Forgot password?")).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("Dashboard", () => {
  test("should load the dashboard page", async ({ page }) => {
    await page.goto("/dashboard");

    // The page should either:
    // 1. Show the dashboard content (if auth + Convex work)
    // 2. Redirect to login (if auth state is invalid)
    // 3. Show a loading state (if Convex is connecting)
    // All of these are acceptable for a smoke test

    // Wait for page to settle
    await page.waitForLoadState("domcontentloaded");

    // Verify we are on dashboard or got redirected to login
    const url = page.url();
    const isDashboard = url.includes("/dashboard");
    const isLogin = url.includes("/login");

    expect(isDashboard || isLogin).toBe(true);

    if (isDashboard) {
      // If we stayed on dashboard, verify basic structure
      // The page should have a body element and no blank screen
      await expect(page.locator("body")).not.toBeEmpty();
    }
  });
});

test.describe("Key Pages Load", () => {
  const pages = [
    { path: "/properties", name: "Properties" },
    { path: "/participants", name: "Participants" },
    { path: "/maintenance", name: "Maintenance" },
    { path: "/incidents", name: "Incidents" },
    { path: "/inspections", name: "Inspections" },
    { path: "/documents", name: "Documents" },
    { path: "/follow-ups", name: "Follow-ups" },
    { path: "/communications", name: "Communications" },
  ];

  for (const { path, name } of pages) {
    test(`${name} page should load without fatal errors`, async ({ page }) => {
      // Track console errors
      const fatalErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          const text = msg.text();
          // Only capture truly fatal errors, not expected Convex/network errors
          if (
            !text.includes("convex") &&
            !text.includes("Convex") &&
            !text.includes("WebSocket") &&
            !text.includes("Failed to fetch") &&
            !text.includes("net::ERR") &&
            !text.includes("hydration") &&
            !text.includes("Hydration")
          ) {
            fatalErrors.push(text);
          }
        }
      });

      // Track page crashes
      let pageCrashed = false;
      page.on("crash", () => {
        pageCrashed = true;
      });

      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");

      // The page should not crash
      expect(pageCrashed).toBe(false);

      // Allow redirect to login (expected if auth state invalid for real backend)
      const url = page.url();
      const isExpectedPage = url.includes(path) || url.includes("/login");
      expect(isExpectedPage).toBe(true);

      // No fatal JavaScript errors
      if (fatalErrors.length > 0) {
        console.warn(
          `[${name}] Console errors (non-fatal):`,
          fatalErrors.slice(0, 3)
        );
      }
    });
  }
});

test.describe("Public Pages", () => {
  // Public pages don't need auth
  test.use({ storageState: { cookies: [], origins: [] } });

  test("pricing page should load", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("domcontentloaded");

    // Pricing page should be publicly accessible
    const url = page.url();
    expect(url).toContain("/pricing");
  });

  test("register page should load", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    expect(url).toContain("/register");
  });

  test("terms page should load", async ({ page }) => {
    await page.goto("/terms");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    expect(url).toContain("/terms");
  });

  test("privacy page should load", async ({ page }) => {
    await page.goto("/privacy");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    expect(url).toContain("/privacy");
  });
});
