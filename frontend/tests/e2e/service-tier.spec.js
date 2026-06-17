const { test, expect } = require("@playwright/test");
const { loginAsUser, pickSwitchProduct } = require("./helpers");

test.describe("Service tier picker (VPS / VPSN)", () => {
  test("standard VPS appears on pill after selection", async ({ page }) => {
    await loginAsUser(page);
    const panel = await pickSwitchProduct(page, /VA1800-8T-2S/);

    const svcSelect = panel.locator("select").first();
    await expect(svcSelect).toBeVisible();
    await expect(svcSelect.locator('option[value="standard"]')).toBeEnabled();

    await svcSelect.selectOption("standard");

    await page.click("#equipment-picker-confirm");
    await expect(page.locator("#equipment-picker-overlay")).toBeHidden({
      timeout: 10_000,
    });

    const pill = page.locator("#selected-items-pills .pill").first();
    await expect(pill).toContainText(/VPS/i, { timeout: 10_000 });
    await expect(pill).not.toContainText(/VPSN/i);
  });

  test("extended VPSN appears on pill after selection", async ({ page }) => {
    await loginAsUser(page);
    const panel = await pickSwitchProduct(page, /VA1800-8T-2S/);

    const svcSelect = panel.locator("select").first();
    await expect(svcSelect.locator('option[value="extended"]')).toBeEnabled();
    await svcSelect.selectOption("extended");

    await page.click("#equipment-picker-confirm");
    await expect(page.locator("#equipment-picker-overlay")).toBeHidden({
      timeout: 10_000,
    });

    const pill = page.locator("#selected-items-pills .pill").first();
    await expect(pill).toContainText(/VPSN/i, { timeout: 10_000 });
  });
});
