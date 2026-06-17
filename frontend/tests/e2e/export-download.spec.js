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

    const xlsxLoad = page.waitForResponse(
      (response) =>
        response.url().includes("/specification.xlsx") &&
        response.request().method() === "GET" &&
        response.ok(),
      { timeout: 20_000 }
    );
    await page.click("#config-export-xlsx-btn");
    const response = await xlsxLoad;

    expect(response.headers()["content-type"] || "").toMatch(
      /spreadsheet|excel|octet-stream/i
    );
    const body = await response.body();
    expect(body.byteLength).toBeGreaterThan(100);
  });

  test("export dialog downloads CSV specification file", async ({ page }) => {
    await loginAsUser(page);
    await pickFirstCatalogProduct(page);
    await submitConfigurationWithProject(page, `E2E csv ${Date.now()}`);

    const csvLoad = page.waitForResponse(
      (response) =>
        response.url().includes("/specification.csv") &&
        response.request().method() === "GET" &&
        response.ok(),
      { timeout: 20_000 }
    );
    await page.click("#config-export-csv-btn");
    const response = await csvLoad;

    expect(response.headers()["content-type"] || "").toMatch(/csv|text\/plain/i);
    const text = await response.text();
    expect(text.length).toBeGreaterThan(10);
  });
});
