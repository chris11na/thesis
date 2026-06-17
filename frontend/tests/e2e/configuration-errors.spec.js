const { test, expect } = require("@playwright/test");
const {
  loginAsUser,
  pickFirstCatalogProduct,
  clickCreateConfigForValidation,
} = require("./helpers");

test.describe("Configuration validation errors", () => {
  test("submit without project name shows toast error", async ({ page }) => {
    await loginAsUser(page);
    await pickFirstCatalogProduct(page);

    await page.fill("#project-name-input", "");
    await clickCreateConfigForValidation(page);

    await expect(page.locator("#app-toast-host")).toContainText(
      /проект|project/i,
      { timeout: 10_000 }
    );
    await expect(page.locator("#confirm-submit-dialog")).toBeHidden();
  });

  test("submit without selected equipment shows toast error", async ({ page }) => {
    await loginAsUser(page);
    await expect(page.locator("#user-configurator-layout")).toBeVisible({
      timeout: 20_000,
    });

    await page.fill("#project-name-input", "E2E empty config");
    await clickCreateConfigForValidation(page);

    await expect(page.locator("#app-toast-host")).toContainText(
      /позици|line|select|выбери/i,
      { timeout: 10_000 }
    );
  });
});
