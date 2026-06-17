const { test, expect } = require("@playwright/test");
const {
  loginAsAdmin,
  waitForProductsApi,
  openAdminCompaniesFold,
  openAdminCatalogFold,
  confirmAdminDialog,
} = require("./helpers");

test.describe("Admin CRUD", () => {
  test("admin can create, edit and delete a company", async ({ page }) => {
    await loginAsAdmin(page);
    await openAdminCompaniesFold(page);

    const suffix = Date.now();
    const companyName = `E2E Co ${suffix}`;
    const companyDomain = `e2e-${suffix}.test`;
    const updatedName = `${companyName} Updated`;

    await page.fill("#admin-company-name", companyName);
    await page.fill("#admin-company-domain", companyDomain);

    const createReq = page.waitForResponse(
      (response) =>
        response.url().includes("/companies") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 20_000 }
    );
    await page.click("#admin-add-company-btn");
    await createReq;

    const row = page.locator("#admin-companies-tbody tr").filter({
      hasText: companyDomain,
    });
    await expect(row).toBeVisible({ timeout: 15_000 });

    await row.getByRole("button", { name: /изменить|edit/i }).click();
    await expect(page.locator("#admin-company-edit-wrap")).toBeVisible();
    await page.fill("#admin-company-edit-name", updatedName);

    const patchReq = page.waitForResponse(
      (response) =>
        response.url().match(/\/companies\/\d+/) &&
        response.request().method() === "PATCH" &&
        response.ok(),
      { timeout: 20_000 }
    );
    await page.click("#admin-save-company-btn");
    await patchReq;

    await expect(
      page.locator("#admin-companies-tbody tr").filter({ hasText: updatedName })
    ).toBeVisible({ timeout: 15_000 });

    const deleteRow = page.locator("#admin-companies-tbody tr").filter({
      hasText: companyDomain,
    });
    await deleteRow.getByRole("button", { name: /удалить|delete/i }).click();
    await confirmAdminDialog(page);

    await expect(
      page.locator("#admin-companies-tbody tr").filter({ hasText: companyDomain })
    ).toHaveCount(0, { timeout: 15_000 });
  });

  test("admin can create a catalog product via drawer", async ({ page }) => {
    await loginAsAdmin(page);
    await openAdminCatalogFold(page);

    const productName = `E2E-Product-${Date.now()}`;

    await page.click("#admin-add-product-btn");
    await expect(page.locator("#admin-product-drawer-overlay")).toBeVisible({
      timeout: 10_000,
    });

    const drawer = page.locator("#admin-product-drawer-body");
    await drawer.locator('input[type="text"]').first().fill(productName);
    await drawer.locator("textarea").first().fill("E2E product description");

    const createReq = page.waitForResponse(
      (response) =>
        response.url().includes("/products") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 20_000 }
    );
    await drawer.getByRole("button", { name: /создать|create/i }).click();
    await createReq;

    const searchLoad = waitForProductsApi(page);
    await page.fill("#admin-products-search-input", productName);
    await page.press("#admin-products-search-input", "Enter");
    await searchLoad;

    await expect(page.locator("#admin-products-tbody")).toContainText(productName, {
      timeout: 15_000,
    });
  });

  test("admin can edit an existing catalog product", async ({ page }) => {
    await loginAsAdmin(page);
    await openAdminCatalogFold(page);

    const searchLoad = waitForProductsApi(page);
    await page.fill("#admin-products-search-input", "VNC-2000");
    await page.press("#admin-products-search-input", "Enter");
    await searchLoad;

    const row = page.locator("#admin-products-tbody tr").filter({
      hasText: "VNC-2000",
    });
    await expect(row.first()).toBeVisible({ timeout: 15_000 });
    await row.first().getByRole("button", { name: /изменить|edit/i }).click();

    await expect(page.locator("#admin-product-drawer-overlay")).toBeVisible({
      timeout: 10_000,
    });

    const drawer = page.locator("#admin-product-drawer-body");
    const desc = drawer.locator("textarea").first();
    const previous = await desc.inputValue();
    const marker = ` e2e-${Date.now()}`;
    await desc.fill(previous + marker);

    const patchReq = page.waitForResponse(
      (response) =>
        response.url().match(/\/products\/\d+/) &&
        response.request().method() === "PATCH" &&
        response.ok(),
      { timeout: 20_000 }
    );
    await drawer.locator(".admin-product-edit-actions button.primary-btn").click();
    await patchReq;

    await expect(page.locator("#admin-products-tbody")).toContainText(marker, {
      timeout: 15_000,
    });

    // Restore original description so repeated runs stay idempotent.
    const editRow = page.locator("#admin-products-tbody tr").filter({
      hasText: "VNC-2000",
    });
    await editRow.first().getByRole("button", { name: /изменить|edit/i }).click();
    await expect(page.locator("#admin-product-drawer-overlay")).toBeVisible();
    await drawer.locator("textarea").first().fill(previous);
    const restoreReq = page.waitForResponse(
      (response) =>
        response.url().match(/\/products\/\d+/) &&
        response.request().method() === "PATCH" &&
        response.ok(),
      { timeout: 20_000 }
    );
    await drawer.locator(".admin-product-edit-actions button.primary-btn").click();
    await restoreReq;
  });
});
