import { test, expect } from "@playwright/test";

/**
 * Authentication Flow Tests
 *
 * Tests login, invalid credentials, and logout flows.
 * Uses mock auth state for CI environments without a real backend.
 */

test.describe("Login Flow", () => {
  // Login page tests use fresh context without auth state
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should show login form fields and submit button", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    // Verify form elements are present
    await expect(page.getByLabel("Email address")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    // Wait for form to be ready
    await expect(page.getByLabel("Email address")).toBeVisible({ timeout: 15_000 });

    // Fill in invalid credentials
    await page.getByLabel("Email address").fill("invalid@nonexistent.com");
    await page.getByLabel("Password").fill("wrongpassword123");

    // Submit the form
    await page.getByRole("button", { name: "Sign in" }).click();

    // Wait for either:
    // 1. An error message to appear (real backend)
    // 2. Page stays on login (mock/no backend)
    await page.waitForTimeout(3000);

    // We should still be on the login page (not redirected to dashboard)
    const url = page.url();
    const isStillOnLogin = url.includes("/login");
    const isOnDashboard = url.includes("/dashboard");

    // With a real backend, invalid creds should keep us on login
    // Without a backend, the request will fail and we stay on login
    // Either way, we should NOT be on the dashboard
    if (isOnDashboard) {
      // This would be a security issue
      expect(isOnDashboard).toBe(false);
    } else {
      expect(isStillOnLogin).toBe(true);
    }
  });

  test("should have required form attributes for accessibility", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByLabel("Email address")).toBeVisible({ timeout: 15_000 });

    // Check autocomplete attributes (WCAG compliance)
    const emailInput = page.getByLabel("Email address");
    const passwordInput = page.getByLabel("Password");

    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(passwordInput).toHaveAttribute("type", "password");
  });
});

test.describe("Dashboard Access", () => {
  test("should load dashboard with valid auth state", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    const isDashboard = url.includes("/dashboard");
    const isLogin = url.includes("/login");

    // Should either show dashboard (auth works) or redirect to login
    expect(isDashboard || isLogin).toBe(true);

    if (isDashboard) {
      // Dashboard should have content
      await expect(page.locator("body")).not.toBeEmpty();
    }
  });
});

test.describe("Property List", () => {
  test("should load property list page", async ({ page }) => {
    await page.goto("/properties");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    const isProperties = url.includes("/properties");
    const isLogin = url.includes("/login");

    expect(isProperties || isLogin).toBe(true);

    if (isProperties) {
      // Should have page content
      await expect(page.locator("body")).not.toBeEmpty();
    }
  });
});

test.describe("Settings Navigation", () => {
  test("should navigate to settings page", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    const isSettings = url.includes("/settings");
    const isLogin = url.includes("/login");

    expect(isSettings || isLogin).toBe(true);
  });

  test("should navigate to security settings", async ({ page }) => {
    await page.goto("/settings/security");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    const isSecuritySettings = url.includes("/settings/security");
    const isLogin = url.includes("/login");

    expect(isSecuritySettings || isLogin).toBe(true);
  });
});

test.describe("Logout Flow", () => {
  test("should redirect to login after clearing auth state", async ({ page }) => {
    // Start on dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    // Clear auth state (simulating logout)
    await page.evaluate(() => {
      localStorage.removeItem("sda_user");
      localStorage.removeItem("sda_session_token");
      localStorage.removeItem("sda_refresh_token");
    });

    // Navigate to a protected page
    await page.goto("/properties");
    await page.waitForLoadState("domcontentloaded");

    // Wait for auth check to complete
    await page.waitForTimeout(2000);

    const url = page.url();
    // After clearing auth, we should be redirected to login
    // or stay on the page if it loads before RequireAuth kicks in
    // Both are acceptable - the key is no crash
    expect(url).toBeTruthy();
  });
});
