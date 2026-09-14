import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    headless: true,
  },
  webServer: {
    command: "tsx e2e/boot.ts",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 90_000,
  },
});
