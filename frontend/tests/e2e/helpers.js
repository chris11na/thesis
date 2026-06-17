const { expect } = require("@playwright/test");

async function login(page, email, password) {
  await page.goto("/login.html");
  await page.fill("#login-email-input", email);
  await page.fill("#login-password-input", password);
  await page.click("#login-btn");
  await page.waitForURL(/index\.html/, { timeout: 20_000 });
}

async function loginAsUser(page) {
  await login(page, "user@example.com", "user123");
  await expect(page.locator("#user-configurator-layout")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator("#catalog-groups-grid .catalog-nav-card").first()).toBeVisible({
    timeout: 20_000,
  });
}

async function loginAsAdmin(page) {
  await login(page, "admin@example.com", "admin123");
  await expect(page.locator("#role-badge")).toHaveClass(/role-admin/);
  await expect(page.locator("#admin-catalog-block")).toBeVisible({
    timeout: 15_000,
  });
}

async function logout(page) {
  const logoutReq = page
    .waitForResponse(
      (response) =>
        response.url().includes("/auth/logout") &&
        response.request().method() === "POST",
      { timeout: 15_000 }
    )
    .catch(() => null);
  await page.click("#clear-token-btn");
  await logoutReq;
  await page.waitForURL(/login\.html/, { timeout: 15_000 });
}

async function waitForProductsApi(page, method = "GET") {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/products") &&
      response.request().method() === method &&
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

async function openWifiEquipmentCatalog(page) {
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
}

async function pickFirstCatalogProduct(page) {
  await openWifiEquipmentCatalog(page);

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

async function pickWifiControllerProduct(page) {
  await openWifiEquipmentCatalog(page);

  const controller = page
    .locator("#products-list .product-item")
    .filter({ hasText: /контроллер|controller/i })
    .first();
  await expect(controller).toBeVisible({ timeout: 20_000 });
  await controller.click();
  await dismissEquipmentPickerIfOpen(page);

  await expect(page.locator(".equipment-addon-panel input[type='number']").first()).toBeVisible({
    timeout: 15_000,
  });
}

async function submitConfigurationWithProject(page, projectName) {
  await page.fill("#project-name-input", projectName);
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
}

module.exports = {
  login,
  loginAsUser,
  loginAsAdmin,
  logout,
  waitForProductsApi,
  dismissEquipmentPickerIfOpen,
  openWifiEquipmentCatalog,
  pickFirstCatalogProduct,
  pickWifiControllerProduct,
  submitConfigurationWithProject,
};
