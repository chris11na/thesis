const { test, expect } = require("@playwright/test");

test.describe("Frontend configuration flow", () => {
  test("creates configuration as admin", async ({ page }) => {
    await page.goto("/");
    await page.fill("#login-email-input", "admin@example.com");
    await page.fill("#login-password-input", "admin123");
    await page.click("#login-btn");

    // Select first product.
    await page.locator("#products-list .product-item").first().click();
    await page.click("#create-config-btn");

    await expect(page.locator("#status-area")).toContainText(
      "Конфигурация успешно создана"
    );
  });

  test("shows compatibility error for forbidden item", async ({ page }) => {
    await page.goto("/");
    await page.fill("#login-email-input", "admin@example.com");
    await page.fill("#login-password-input", "admin123");
    await page.click("#login-btn");

    // Select forbidden seeded product id=103.
    await page.locator("#products-list .product-item:has-text('103')").click();
    await page.click("#create-config-btn");

    await expect(page.locator("#status-area")).toContainText("несовместим");
  });
});
