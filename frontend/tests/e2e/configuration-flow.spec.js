const { test, expect } = require("@playwright/test");

async function loginAsUser(page) {
  await page.goto("/login.html");
  await page.fill("#login-email-input", "user@example.com");
  await page.fill("#login-password-input", "user123");
  await page.click("#login-btn");
  await page.waitForURL(/index\.html/, { timeout: 20_000 });
  await expect(page.locator("#user-configurator-layout")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator("#catalog-groups-grid .catalog-nav-card").first()).toBeVisible({
    timeout: 20_000,
  });
}

async function waitForProductsApi(page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/products") &&
      response.request().method() === "GET" &&
      response.ok(),
    { timeout: 20_000 }
  );
}

async function dismissEquipmentPickerIfOpen(page) {
  const overlay = page.locator("#equipment-picker-overlay");
  if (await overlay.isVisible().catch(() => false)) {
    await page.click("#equipment-picker-confirm");
    await expect(overlay).toBeHidden({ timeout: 10_000 });
  }
}

async function pickFirstCatalogProduct(page) {
  await expect(page.locator("#products-search-input")).toBeVisible({
    timeout: 20_000,
  });

  const wifiGroup = page
    .locator("#catalog-groups-grid .catalog-nav-card")
    .filter({ hasText: /беспроводн/i })
    .first();
  await expect(wifiGroup).toBeVisible({ timeout: 20_000 });

  const productsLoad = waitForProductsApi(page);
  await wifiGroup.click();
  await page
    .locator("#catalog-subgroups-grid .catalog-nav-card-title")
    .filter({ hasText: /^Оборудование$/ })
    .first()
    .click();
  await productsLoad;

  const product = page
    .locator("#products-list .product-item")
    .filter({ has: page.locator(".product-name") })
    .first();
  await expect(product).toBeVisible({ timeout: 20_000 });
  await product.click();
  await dismissEquipmentPickerIfOpen(page);

  await expect(page.locator("#selected-items-pills .pill")).toHaveCount(1, {
    timeout: 10_000,
  });
}

test.describe("Frontend configuration flow", () => {
  test("creates configuration and offers specification export", async ({ page }) => {
    await loginAsUser(page);
    await pickFirstCatalogProduct(page);

    await page.fill("#project-name-input", "E2E export test");
    await expect(page.locator("#create-config-btn")).toBeEnabled({
      timeout: 10_000,
    });

    await page.click("#create-config-btn");
    await expect(page.locator("#confirm-submit-dialog")).toBeVisible({
      timeout: 10_000,
    });
    await page.click("#confirm-submit-ok");

    await expect(page.locator("#config-export-dialog")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator("#config-export-title")).toContainText(
      "Конфигурация отправлена"
    );
    await expect(page.locator("#app-toast-host")).toContainText(
      /Конфигурация (отправлена|успешно создана|сохранена)/
    );
  });
});
