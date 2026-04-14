const { test, expect } = require("@playwright/test");

async function loginAsUser(page) {
  await page.goto("/login.html");
  await page.fill("#login-email-input", "user@example.com");
  await page.fill("#login-password-input", "user123");
  await page.click("#login-btn");
  await page.waitForURL(/index\.html/, { timeout: 15_000 });
}

test.describe("Frontend configuration flow", () => {
  test("creates configuration as user (demo controller)", async ({ page }) => {
    await loginAsUser(page);
    await page
      .locator("#products-list .product-item")
      .filter({ hasText: "Контроллер" })
      .first()
      .click();
    await page.click("#create-config-btn");
    await expect(page.locator("#status-area")).toContainText(
      "Конфигурация успешно создана"
    );
  });
});
