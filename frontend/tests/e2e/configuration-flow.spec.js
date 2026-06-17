const { test, expect } = require("@playwright/test");
const {
  loginAsUser,
  pickFirstCatalogProduct,
  submitConfigurationWithProject,
} = require("./helpers");

test.describe("Frontend configuration flow", () => {
  test("creates configuration and offers specification export", async ({ page }) => {
    await loginAsUser(page);
    await pickFirstCatalogProduct(page);
    await submitConfigurationWithProject(page, "E2E export test");

    await expect(page.locator("#config-export-title")).toContainText(
      "Конфигурация отправлена"
    );
    await expect(page.locator("#app-toast-host")).toContainText(
      /Конфигурация (отправлена|успешно создана|сохранена)/
    );
  });
});
