const { test, expect } = require("@playwright/test");
const { loginAsUser, openWifiEquipmentCatalog, waitForProductsApi } = require("./helpers");

test.describe("User catalog search", () => {
  test("product search narrows Wi-Fi equipment list", async ({ page }) => {
    await loginAsUser(page);
    await openWifiEquipmentCatalog(page);

    const beforeCount = await page.locator("#products-list .product-item").count();
    expect(beforeCount).toBeGreaterThan(0);

    const searchLoad = waitForProductsApi(page);
    await page.fill("#products-search-input", "VAP");
    await page.press("#products-search-input", "Enter");
    await searchLoad;

    const afterCount = await page.locator("#products-list .product-item").count();
    expect(afterCount).toBeGreaterThan(0);
    expect(afterCount).toBeLessThanOrEqual(beforeCount);

    await expect(page.locator("#products-list .product-item").first()).toContainText(
      /VAP|точк|access point/i
    );
  });
});
