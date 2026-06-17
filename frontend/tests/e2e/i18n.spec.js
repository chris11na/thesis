const { test, expect } = require("@playwright/test");
const { loginAsUser } = require("./helpers");

test.describe("UI language toggle", () => {
  test("index toggles labels to English", async ({ page }) => {
    await loginAsUser(page);

    await expect(page.locator("#lang-toggle-btn")).toHaveText("RU");
    await expect(page.locator("#create-config-label")).toContainText(
      /отправ|регистрац/i
    );

    await page.click("#lang-toggle-btn");

    await expect(page.locator("#lang-toggle-btn")).toHaveText("EN");
    await expect(page.locator("#create-config-label")).toContainText(
      /submit|register|send/i
    );
  });

  test("login page toggles tab labels to English", async ({ page }) => {
    await page.goto("/login.html");
    await expect(page.locator("#tab-login-btn")).toContainText(/вход|sign/i);

    await page.click("#lang-toggle-btn");

    await expect(page.locator("#tab-login-btn")).toHaveText(/sign in/i);
    await expect(page.locator("#tab-register-btn")).toHaveText(/sign up|register/i);
  });
});
