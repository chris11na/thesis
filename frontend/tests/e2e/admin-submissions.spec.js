const { test, expect } = require("@playwright/test");
const {
  loginAsAdmin,
  loginAsUser,
  logout,
  pickFirstCatalogProduct,
  submitConfigurationWithProject,
} = require("./helpers");

async function waitForSubmissionsApi(page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/configurations/submissions") &&
      response.request().method() === "GET" &&
      response.ok(),
    { timeout: 20_000 }
  );
}

test.describe("Admin sales submissions", () => {
  test("admin sees submission created by user and search finds it", async ({ page }) => {
    const projectName = `E2E submission ${Date.now()}`;

    await loginAsUser(page);
    await pickFirstCatalogProduct(page);
    await submitConfigurationWithProject(page, projectName);
    await logout(page);

    await loginAsAdmin(page);
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
