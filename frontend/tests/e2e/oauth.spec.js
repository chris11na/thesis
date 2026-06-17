const { test, expect } = require("@playwright/test");

test.describe("OAuth login UI", () => {
  test("login page loads OAuth providers from API", async ({ page }) => {
    const providersReq = page.waitForResponse(
      (response) =>
        response.url().includes("/auth/oauth/providers") &&
        response.request().method() === "GET" &&
        response.ok(),
      { timeout: 20_000 }
    );

    await page.goto("/login.html");
    await providersReq;
  });

  test("shows Microsoft sign-in link when provider is enabled", async ({ page }) => {
    await page.route("**/auth/oauth/providers", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          google: false,
          microsoft: true,
          yandex: false,
        }),
      });
    });

    await page.goto("/login.html");

    const microsoftLink = page.locator('a.oauth-btn[data-oauth-provider="microsoft"]');
    await expect(microsoftLink).toBeVisible({ timeout: 15_000 });
    await expect(microsoftLink).toHaveAttribute(
      "href",
      /\/auth\/microsoft\/login$/
    );
    await expect(microsoftLink).toContainText(/Microsoft/i);
  });

  test("shows OAuth error message from redirect query", async ({ page }) => {
    await page.goto(
      "/login.html?oauth_error=1&detail=" + encodeURIComponent("OAuth provider rejected")
    );

    await expect(page.locator("#auth-status-area")).toContainText(
      /OAuth provider rejected/i,
      { timeout: 10_000 }
    );
    await expect(page).not.toHaveURL(/oauth_error=1/);
  });
});
