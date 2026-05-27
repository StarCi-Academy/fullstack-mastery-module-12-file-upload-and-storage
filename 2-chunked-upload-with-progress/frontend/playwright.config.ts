// Playwright config — real Google Chrome (channel='chrome'), port 3361.
// (EN: Playwright config — uses real Google Chrome, frontend port 3361.)
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./scripts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 120_000,
  use: {
    baseURL: "http://localhost:3361",
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
});
