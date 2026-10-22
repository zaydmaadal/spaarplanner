import { expect, test } from "@playwright/test";
import { hydrated, password, register, skip } from "./helpers";

// Production smoke test, run by hand after a deploy (see playwright.smoke.config.ts). It leaves nothing behind:
// the account it registers is deleted again through the page.
test.skip(!process.env.SMOKE_BASE_URL, "SMOKE_BASE_URL is not set");
test.use({ baseURL: process.env.SMOKE_BASE_URL });

test("register, open the overview and delete the account", async ({ page }) => {
  // 19 characters: a username is 3 to 20.
  await register(page, `smoke-${Date.now()}`);

  // Overslaan on every step is the cheapest way through; the last one finishes the onboarding.
  for (let step = 1; step <= 8; step++) await skip(page, step);
  await expect(page).toHaveURL(/\/overzicht$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hoi");

  await page.goto("/meer/account");
  await hydrated(page);
  const form = page.locator("form").filter({ visible: true });
  await form.getByLabel("Wachtwoord", { exact: true }).fill(password);
  await form.getByRole("button", { name: "Account wissen", exact: true }).click();
  await form.getByRole("button", { name: "Ja, wis mijn account", exact: true }).click();
  await expect(page).toHaveURL(/\/inloggen$/);
});
