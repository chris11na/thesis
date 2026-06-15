const { test, expect } = require("@playwright/test");

async function loginAsUser(page) {
  await page.goto("/login.html");
  await page.fill("#login-email-input", "user@example.com");
  await page.fill("#login-password-input", "user123");
  await page.click("#login-btn");
  await page.waitForURL(/index\.html/, { timeout: 15_000 });
}

async function pickFirstMatchingProduct(page, query) {
  await page.fill("#products-search-input", query);
  await page.press("#products-search-input", "Enter");
  const product = page.locator("#products-list .product-item").first();
  await expect(product).toBeVisible({ timeout: 15_000 });
  await product.click();
}

test.describe("Frontend configuration flow", () => {
  test("creates configuration and offers specification export", async ({ page }) => {
    await loginAsUser(page);
    await pickFirstMatchingProduct(page, "Контроллер");
    await page.fill("#project-name-input", "E2E export test");
    await page.click("#create-config-btn");
    await expect(page.locator("#confirm-submit-dialog")).toBeVisible();
    await page.click("#confirm-submit-ok");
    await expect(page.locator("#config-export-dialog")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#config-export-title")).toContainText(
      "Конфигурация отправлена"
    );
    await expect(page.locator("#app-toast-host")).toContainText(
      /Конфигурация (отправлена|успешно создана|сохранена)/
    );
  });
});
