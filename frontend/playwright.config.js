// Playwright config for static frontend prototype.
const { defineConfig } = require("@playwright/test");

const isCi = Boolean(process.env.CI);

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  retries: isCi ? 2 : 0,
  reporter: isCi ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:5500",
    headless: true,
    trace: isCi ? "on-first-retry" : "off",
  },
  webServer: {
    command: "python -m http.server 5500",
    url: "http://127.0.0.1:5500",
    reuseExistingServer: true,
    timeout: 20_000,
  },
});
