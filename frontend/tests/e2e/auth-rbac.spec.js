const { test, expect } = require("@playwright/test");

test.describe("Frontend auth and RBAC", () => {
  test("shows anonymous state before login", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#role-badge")).toHaveText("Anonymous");
    await expect(page.locator("#create-config-btn")).toBeDisabled();
  });

  test("login as admin shows admin controls", async ({ page }) => {
    await page.goto("/");
    await page.fill("#login-email-input", "admin@example.com");
    await page.fill("#login-password-input", "admin123");
    await page.click("#login-btn");

    await expect(page.locator("#role-badge")).toHaveText("Admin");
    await expect(page.locator("#admin-user-block")).toBeVisible();
    await expect(page.locator("#create-config-btn")).toBeEnabled();
  });

  test("login as user hides admin-only block", async ({ page }) => {
    await page.goto("/");
    await page.fill("#login-email-input", "user@example.com");
    await page.fill("#login-password-input", "user123");
    await page.click("#login-btn");

    await expect(page.locator("#role-badge")).toHaveText("User");
    await expect(page.locator("#admin-user-block")).toBeHidden();
  });
});
