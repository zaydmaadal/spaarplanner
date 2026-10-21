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
  use: { baseURL: "http://localhost:3000" },
  projects: [
    { name: "iPhone 14", use: { ...devices["iPhone 14"] } },
    { name: "Pixel 7", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [server(3000, "open"), server(3001, "closed")],
});
