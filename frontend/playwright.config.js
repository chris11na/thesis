// Playwright config for static frontend prototype.
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL: "http://127.0.0.1:5500",
    headless: true
  },
  webServer: {
    command: "python -m http.server 5500",
    url: "http://127.0.0.1:5500",
    reuseExistingServer: true,
    timeout: 20_000
  }
});
