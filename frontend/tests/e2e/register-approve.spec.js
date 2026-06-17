const { test, expect } = require("@playwright/test");

async function login(page, email, password) {
  await page.goto("/login.html");
  await page.fill("#login-email-input", email);
  await page.fill("#login-password-input", password);
  await page.click("#login-btn");
  await page.waitForURL(/index\.html/, { timeout: 20_000 });
}

async function logout(page) {
  await page.click("#clear-token-btn");
  await page.waitForURL(/login\.html/, { timeout: 15_000 });
}

async function waitForUsersApi(page, method = "GET") {
  return page.waitForResponse(
    (response) =>
      /\/users(\?|$)/.test(response.url()) &&
      response.request().method() === method &&
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

    await login(page, "admin@example.com", "admin123");
    await expect(page.locator("#admin-users-fold")).toBeVisible({
      timeout: 10_000,
    });

    await page.locator("#admin-users-fold").evaluate((el) => {
      el.open = true;
    });

    const usersLoad = waitForUsersApi(page, "GET");
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
