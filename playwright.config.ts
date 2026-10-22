import { defineConfig, devices } from "@playwright/test";

// Two servers from one build: SIGNUP_MODE is read at request time, so the closed scenario
// just needs its own port. Tests for it set baseURL to :3001.
const server = (port: number, signupMode: string) => ({
  command: `npm run start -- --port ${port}`,
  port,
  env: { SIGNUP_MODE: signupMode },
  reuseExistingServer: !process.env.CI,
});

export default defineConfig({
  testDir: "e2e",
  // The production smoke test runs by hand with playwright.smoke.config.ts.
  testIgnore: "**/*.prod.spec.ts",
  globalSetup: "./e2e/global-setup.ts",
  forbidOnly: !!process.env.CI,
  // CI uploads playwright-report/ and test-results/ (traces) when a run fails.
  reporter: process.env.CI ? [["dot"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "iPhone 14", use: { ...devices["iPhone 14"] } },
    { name: "Pixel 7", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [server(3000, "open"), server(3001, "closed")],
});
