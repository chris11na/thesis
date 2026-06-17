const { test, expect } = require("@playwright/test");
const {
  login,
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

test.describe("Registration and admin approval", () => {
  test("pending user cannot sign in until admin approves", async ({ page }) => {
    const stamp = Date.now();
    const email = `e2e-reg-${stamp}@example.com`;
    const password = "regpass1";
    const displayName = `E2E Reg ${stamp}`;

    await page.goto("/login.html");
    await page.click("#tab-register-btn");
    await page.fill("#register-name-input", displayName);
    await page.fill("#register-email-input", email);
    await page.fill("#register-password-input", password);
    await page.click("#register-btn");

    await expect(page.locator("#auth-status-area")).toContainText(
      /одобрен|approval|pending/i,
      { timeout: 15_000 }
    );

    await page.click("#tab-login-btn");
    await page.fill("#login-email-input", email);
    await page.fill("#login-password-input", password);
    await page.click("#login-btn");

    await expect(page.locator("#auth-status-area")).toContainText(
      /pending|одобрен|approval/i,
      { timeout: 15_000 }
    );
    await expect(page).toHaveURL(/login\.html/);

    await loginAsAdmin(page);
    await page.locator("#admin-users-fold").evaluate((el) => {
      el.open = true;
    });

    const usersLoad = page.waitForResponse(
      (response) =>
        /\/users(\?|$)/.test(response.url()) &&
        response.request().method() === "GET" &&
        response.ok(),
      { timeout: 20_000 }
    );
    await page.click("#admin-users-refresh-btn");
    await usersLoad;

    const row = page.locator("#admin-users-tbody tr").filter({ hasText: email });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toContainText(/ожидает|pending/i);

    const approvePatch = page.waitForResponse(
      (response) =>
        response.url().includes("/users/") &&
        response.request().method() === "PATCH" &&
        response.ok(),
      { timeout: 20_000 }
    );
    await row.getByRole("button", { name: /одобрить|approve/i }).click();
    await approvePatch;

    await expect(row).toContainText(/одобрен|approved/i, {
      timeout: 15_000,
    });

    await logout(page);

    await login(page, email, password);
    await expect(page.locator("#role-badge")).toHaveClass(/role-user/);
    await expect(page.locator("#user-configurator-layout")).toBeVisible({
      timeout: 15_000,
    });
  });
});
