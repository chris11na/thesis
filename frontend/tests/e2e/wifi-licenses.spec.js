const { test, expect } = require("@playwright/test");
const { loginAsUser, pickWifiControllerProduct, wifiAddonPanel } = require("./helpers");

test.describe("Wi-Fi controller license picker", () => {
  test("target AP suggestion adds license pills", async ({ page }) => {
    await loginAsUser(page);
    await pickWifiControllerProduct(page);

    const pill = page.locator("#selected-items-pills .pill").first();
    await expect(pill).toBeVisible();

    const panel = wifiAddonPanel(page);
    const apInput = panel.locator("input[type='number']").first();
    await apInput.fill("32");

    const suggestLoad = page.waitForResponse(
      (response) =>
        response.url().includes("/license-pack-suggestion") &&
        response.request().method() === "GET" &&
        response.ok(),
      { timeout: 20_000 }
    );
    await panel.getByRole("button", { name: /подобрать|suggest/i }).click();
    await suggestLoad;

    await expect(pill).toContainText(/32/, { timeout: 15_000 });
    await expect(pill).toContainText(/×\s*1|×1|pack x/i);
  });
});
