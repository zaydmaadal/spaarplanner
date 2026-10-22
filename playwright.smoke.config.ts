import { defineConfig, devices } from "@playwright/test";

// Production smoke test, run by hand after a deploy: SMOKE_BASE_URL=https://... npx playwright test -c playwright.smoke.config.ts
// No local servers and no global setup: it needs no secrets, only the public URL.
export default defineConfig({
  testDir: "e2e",
  testMatch: "*.prod.spec.ts",
  use: { ...devices["Pixel 7"], trace: "retain-on-failure" },
});
