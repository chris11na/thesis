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

  test("admin can create user via POST /users form", async ({ page }) => {
    await loginAsAdmin(page);

    await page.locator("#admin-users-fold").evaluate((el) => {
      el.open = true;
    });

    const email = `e2e-admin-create-${Date.now()}@example.com`;
    await page.fill("#admin-new-user-name", "E2E Created User");
    await page.fill("#admin-new-user-email", email);
    await page.fill("#admin-new-user-password", "e2epass1");

    const createReq = page.waitForResponse(
      (response) =>
        response.url().includes("/users") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 20_000 }
    );
    await page.click("#admin-add-user-btn");
    await createReq;

    await expect(page.locator("#admin-users-tbody")).toContainText(email, {
      timeout: 15_000,
    });
  });
});
