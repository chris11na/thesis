const { test, expect } = require("@playwright/test");
const {
  loginAsUser,
  pickFirstCatalogProduct,
  submitConfigurationWithProject,
} = require("./helpers");

test.describe("Specification export download", () => {
  test("export dialog downloads XLSX specification file", async ({ page }) => {
    await loginAsUser(page);
    await pickFirstCatalogProduct(page);
    await submitConfigurationWithProject(page, `E2E xlsx ${Date.now()}`);

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 20_000 }),
      page.click("#config-export-xlsx-btn"),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
    const savePath = await download.path();
    expect(savePath).toBeTruthy();
    const fs = require("fs");
    expect(fs.statSync(savePath).size).toBeGreaterThan(100);
  });

  test("export dialog downloads CSV specification file", async ({ page }) => {
    await loginAsUser(page);
    await pickFirstCatalogProduct(page);
    await submitConfigurationWithProject(page, `E2E csv ${Date.now()}`);

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 20_000 }),
      page.click("#config-export-csv-btn"),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    const savePath = await download.path();
    expect(savePath).toBeTruthy();
    const fs = require("fs");
    expect(fs.statSync(savePath).size).toBeGreaterThan(10);
  });
});
