const { test, expect } = require("@playwright/test");

async function login(page, email, password) {
  await page.goto("/login.html");
  await page.fill("#login-email-input", email);
  await page.fill("#login-password-input", password);
  await page.click("#login-btn");
  await page.waitForURL(/index\.html/, { timeout: 20_000 });
}

async function logout(page) {
  await page.click("#clear-token-btn");
  await page.waitForURL(/login\.html/, { timeout: 15_000 });
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

async function waitForSubmissionsApi(page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/configurations/submissions") &&
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
  if (await page.locator("#config-export-close-btn").isVisible().catch(() => false)) {
    await page.click("#config-export-close-btn");
  }
}

test.describe("Admin sales submissions", () => {
  test("admin sees submission created by user and search finds it", async ({ page }) => {
    const projectName = `E2E submission ${Date.now()}`;

    await login(page, "user@example.com", "user123");
    await expect(page.locator("#user-configurator-layout")).toBeVisible({
      timeout: 20_000,
    });
    await pickFirstCatalogProduct(page);
    await submitConfigurationWithProject(page, projectName);
    await logout(page);

    await login(page, "admin@example.com", "admin123");
    await expect(page.locator("#role-badge")).toHaveClass(/role-admin/);
    await expect(page.locator("#admin-submissions-fold")).toBeVisible({
      timeout: 10_000,
    });

    const refreshLoad = waitForSubmissionsApi(page);
    await page.click("#admin-submissions-refresh-btn");
    await refreshLoad;

    const row = page.locator("#admin-submissions-tbody tr").filter({
      hasText: projectName,
    });
    await expect(row).toBeVisible({ timeout: 15_000 });

    const searchLoad = waitForSubmissionsApi(page);
    await page.fill("#admin-submissions-search-input", projectName);
    await page.press("#admin-submissions-search-input", "Enter");
    await searchLoad;
    await expect(row).toBeVisible({ timeout: 10_000 });
  });
});
