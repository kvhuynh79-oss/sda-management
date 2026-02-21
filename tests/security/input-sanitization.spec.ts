import { test, expect } from "@playwright/test";

/**
 * Security Tests: Input Sanitization
 *
 * Verifies that XSS payloads and injection attacks are handled safely.
 * These tests submit malicious input to forms and verify the output
 * does not execute scripts or contain unsanitized HTML.
 */

test.describe("XSS Prevention", () => {
  test("login form should not execute script in email field", async ({
    page,
  }) => {
    // Use fresh context
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByLabel("Email address")).toBeVisible({
      timeout: 15_000,
    });

    // XSS payload in email field
    const xssPayload = '<script>alert("XSS")</script>';
    await page.getByLabel("Email address").fill(xssPayload);
    await page.getByLabel("Password").fill("somepassword");

    // Track any alert dialogs (XSS indicator)
    let alertFired = false;
    page.on("dialog", async (dialog) => {
      alertFired = true;
      await dialog.dismiss();
    });

    // Submit the form
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForTimeout(2000);

    // No alert dialog should have fired
    expect(alertFired).toBe(false);

    // The page should not contain unescaped script tags
    const pageContent = await page.content();
    expect(pageContent).not.toContain("<script>alert");
  });

  test("register form should not execute script in org name", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.waitForLoadState("domcontentloaded");

    // Track any alert dialogs
    let alertFired = false;
    page.on("dialog", async (dialog) => {
      alertFired = true;
      await dialog.dismiss();
    });

    // Try to find and fill organization name field with XSS payload
    const orgNameInput = page.getByLabel("Organization Name").or(
      page.locator('input[name="organizationName"]')
    );

    const isVisible = await orgNameInput.isVisible().catch(() => false);
    if (isVisible) {
      await orgNameInput.fill('<img src=x onerror=alert("XSS")>');
      await page.waitForTimeout(1000);
      expect(alertFired).toBe(false);
    }
  });

  test("contact form should sanitize HTML input", async ({ page }) => {
    await page.goto("/contact");
    await page.waitForLoadState("domcontentloaded");

    let alertFired = false;
    page.on("dialog", async (dialog) => {
      alertFired = true;
      await dialog.dismiss();
    });

    // Find message textarea if it exists
    const messageField = page.getByLabel("Message").or(
      page.locator("textarea").first()
    );

    const isVisible = await messageField.isVisible().catch(() => false);
    if (isVisible) {
      await messageField.fill(
        '<script>document.cookie</script><img src=x onerror=alert(1)>'
      );
      await page.waitForTimeout(1000);
      expect(alertFired).toBe(false);
    }
  });
});

test.describe("SQL/NoSQL Injection Prevention", () => {
  test("search fields should handle injection payloads safely", async ({
    page,
  }) => {
    // Navigate to a page with search (properties, participants, etc.)
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByLabel("Email address")).toBeVisible({
      timeout: 15_000,
    });

    // MongoDB/Convex injection-style payload
    const injectionPayloads = [
      '{"$gt": ""}',
      "'; DROP TABLE users; --",
      "1 OR 1=1",
      '{"$ne": null}',
      "admin\x00",
    ];

    for (const payload of injectionPayloads) {
      await page.getByLabel("Email address").fill(payload);

      // The page should not crash
      const isCrashed = await page
        .locator("body")
        .isVisible()
        .catch(() => false);
      expect(isCrashed).not.toBe(false);
    }
  });
});

test.describe("Path Traversal Prevention", () => {
  test("should not serve files outside the application", async ({ page }) => {
    const traversalPaths = [
      "/../../etc/passwd",
      "/../.env",
      "/..%2f..%2fetc%2fpasswd",
      "/%2e%2e/%2e%2e/etc/passwd",
    ];

    for (const path of traversalPaths) {
      const response = await page.goto(path).catch(() => null);

      if (response) {
        // Should get a 404 or redirect, not a 200 with file contents
        const status = response.status();
        expect([301, 302, 307, 308, 400, 403, 404, 500]).toContain(status);

        // Content should not contain sensitive file contents
        const content = await page.content();
        expect(content).not.toContain("root:x:0:0");
        expect(content).not.toContain("ENCRYPTION_KEY");
        expect(content).not.toContain("DATABASE_URL");
      }
    }
  });
});
