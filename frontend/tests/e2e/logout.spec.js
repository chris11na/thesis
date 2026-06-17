const { test, expect } = require("@playwright/test");
const { loginAsUser, logout } = require("./helpers");

test.describe("Logout flow", () => {
  test("logout clears tokens and returns to login", async ({ page }) => {
    await loginAsUser(page);

    await expect
      .poll(async () =>
        page.evaluate(() => ({
          access: localStorage.getItem("access_token"),
          refresh: localStorage.getItem("refresh_token"),
        }))
      )
      .toMatchObject({
        access: expect.any(String),
        refresh: expect.any(String),
      });

    await logout(page);

    const tokens = await page.evaluate(() => ({
      access: localStorage.getItem("access_token"),
      refresh: localStorage.getItem("refresh_token"),
    }));
    expect(tokens.access).toBeFalsy();
    expect(tokens.refresh).toBeFalsy();
    await expect(page.locator("#login-email-input")).toBeVisible();
  });
});
