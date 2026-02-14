import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

/**
 * Authentication Setup
 *
 * Logs into the application and saves the authenticated browser state
 * (localStorage, cookies) so subsequent tests can reuse it without
 * logging in again.
 *
 * Requirements:
 * - NEXT_PUBLIC_CONVEX_URL must be set (app needs Convex backend)
 * - TEST_USER_EMAIL and TEST_USER_PASSWORD env vars for credentials
 *   (falls back to demo credentials if not set)
 *
 * The auth state is saved to tests/.auth/user.json and reused by
 * all test projects that depend on "auth-setup".
 */
setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    // If no credentials provided, create a minimal mock auth state
    // This allows smoke tests to verify page structure without a real backend
    console.log(
      "No TEST_USER_EMAIL/TEST_USER_PASSWORD set. Creating mock auth state."
    );
    console.log(
      "Set these env vars to run full E2E tests against a real backend."
    );

    // Navigate to a page to initialize the browser context
    await page.goto("/login");
    await expect(page.locator("h1")).toBeVisible({ timeout: 15_000 });

    // Inject mock auth state into localStorage (matches useAuth hook format)
    await page.evaluate(() => {
      const mockUser = {
        id: "test_user_id",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: "admin",
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };
      localStorage.setItem("sda_user", JSON.stringify(mockUser));

      // Also set session tokens for useSession hook compatibility
      localStorage.setItem("sda_session_token", "mock_session_token");
      localStorage.setItem("sda_refresh_token", "mock_refresh_token");
    });

    await page.context().storageState({ path: authFile });
    return;
  }

  // Real login flow
  await page.goto("/login");

  // Wait for login form to be visible
  await expect(page.locator("h1")).toContainText("Sign in", {
    timeout: 15_000,
  });

  // Fill in credentials
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);

  // Submit the form
  await page.getByRole("button", { name: "Sign in" }).click();

  // Wait for redirect to dashboard (successful login)
  await page.waitForURL("**/dashboard", { timeout: 30_000 });

  // Verify dashboard loaded
  await expect(page.locator("body")).toBeVisible();

  // Save the authenticated state
  await page.context().storageState({ path: authFile });
});
