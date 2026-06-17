const { test, expect } = require("@playwright/test");
const { loginAsAdmin, waitForProductsApi } = require("./helpers");

test.describe("Admin panel", () => {
  test("admin sees default company in organizations table", async ({ page }) => {
    await loginAsAdmin(page);

    await page.locator(".admin-fold--companies").evaluate((el) => {
      el.open = true;
    });

    await expect(page.locator("#admin-companies-tbody tr")).toContainText(
      /example\.com/i,
      { timeout: 15_000 }
    );
  });

  test("admin catalog product search filters equipment list", async ({ page }) => {
    await loginAsAdmin(page);

    await page.locator("#admin-fold-catalog").evaluate((el) => {
      el.closest("details").open = true;
    });

    const searchLoad = waitForProductsApi(page);
    await page.fill("#admin-products-search-input", "VNC");
    await page.press("#admin-products-search-input", "Enter");
    await searchLoad;

    const rows = page.locator("#admin-products-tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    await expect(rows.first()).toContainText(/VNC|контроллер|controller|Wi/i);
  });
});
