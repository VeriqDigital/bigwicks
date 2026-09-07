import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  use: { baseURL: "http://localhost:3107", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox-orders", testMatch: "**/orders.spec.ts", use: { browserName: "firefox" } },
  ],
});
