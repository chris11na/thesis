const { test, expect } = require("@playwright/test");

async function login(page, email, password) {
  await page.goto("/login.html");
  await page.fill("#login-email-input", email);
  await page.fill("#login-password-input", password);
  await page.click("#login-btn");
  await page.waitForURL(/index\.html/, { timeout: 15_000 });
}

test.describe("Frontend auth and RBAC", () => {
  test("index redirects to login when not authenticated", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    });
    await page.goto("/");
    await expect(page).toHaveURL(/login\.html/);
    await expect(page.locator("#login-email-input")).toBeVisible();
  });

  test("login as admin shows admin controls", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await expect(page.locator("#role-badge")).toHaveClass(/role-admin/);
    await expect(page.locator("#admin-catalog-block")).toBeVisible();
    await expect(page.locator("#user-configurator-layout")).toBeHidden();
  });

  test("login as user hides admin-only block", async ({ page }) => {
    await login(page, "user@example.com", "user123");
    await expect(page.locator("#role-badge")).toHaveClass(/role-user/);
    await expect(page.locator("#admin-catalog-block")).toBeHidden();
    await expect(page.locator("#user-configurator-layout")).toBeVisible();
  });
});
