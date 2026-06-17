const { test, expect } = require("@playwright/test");
const {
  loginAsUser,
  openWifiEquipmentCatalog,
  waitForProductsApi,
  waitForCatalogProducts,
} = require("./helpers");

test.describe("User catalog search", () => {
  test("product search narrows Wi-Fi equipment list", async ({ page }) => {
    await loginAsUser(page);
    await openWifiEquipmentCatalog(page);

    const products = await waitForCatalogProducts(page);
    const beforeCount = await products.count();
    expect(beforeCount).toBeGreaterThan(0);

    const searchLoad = waitForProductsApi(page);
    await page.fill("#products-search-input", "VAP");
    await page.press("#products-search-input", "Enter");
    await searchLoad;

    const afterCount = await products.count();
    expect(afterCount).toBeGreaterThan(0);
    expect(afterCount).toBeLessThanOrEqual(beforeCount);

    await expect(page.locator("#products-list .product-item").first()).toContainText(
      /VAP|точк|access point/i
    );
  });
});
