import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  projects: [
    { name: "iPhone 14", use: { ...devices["iPhone 14"] } },
    { name: "Pixel 7", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run start",
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
