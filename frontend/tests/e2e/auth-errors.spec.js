const { test, expect } = require("@playwright/test");

test.describe("Auth error states", () => {
  test("login with wrong password shows error on login page", async ({ page }) => {
    await page.goto("/login.html");
    await page.fill("#login-email-input", "user@example.com");
    await page.fill("#login-password-input", "definitely-wrong-password");
    await page.click("#login-btn");

    await expect(page.locator("#auth-status-area")).toContainText(
      /invalid credentials|неверн|credentials|ошибк/i,
      { timeout: 15_000 }
    );
    await expect(page).toHaveURL(/login\.html/);
  });

  test("register rejects email domain without matching company", async ({ page }) => {
    await page.goto("/login.html");
    await page.click("#tab-register-btn");
    await page.fill("#register-name-input", "Unknown Domain User");
    await page.fill("#register-email-input", `e2e-unknown-${Date.now()}@notregistered.test`);
    await page.fill("#register-password-input", "regpass1");
    await page.click("#register-btn");

    await expect(page.locator("#auth-status-area")).toContainText(
      /organization|компан|domain|домен|registered/i,
      { timeout: 15_000 }
    );
    await expect(page).toHaveURL(/login\.html/);
  });
});
