const { test, expect } = require("@playwright/test");
const { login, loginAsUser, loginAsAdmin } = require("./helpers");

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
    await loginAsAdmin(page);
    await expect(page.locator("#user-configurator-layout")).toBeHidden();
  });

  test("login as user hides admin-only block", async ({ page }) => {
    await loginAsUser(page);
    await expect(page.locator("#role-badge")).toHaveClass(/role-user/);
    await expect(page.locator("#admin-catalog-block")).toBeHidden();
  });
});
