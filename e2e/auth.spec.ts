import { expect, test } from "@playwright/test";
import { fillAndSubmit, password } from "./helpers";

test("register, log out, log in", async ({ page }) => {
  const username = `haider-${Math.random().toString(36).slice(2, 8)}`;

  await page.goto("/registreren");
  await fillAndSubmit(page, username, password, "Account maken");
  await expect(page).toHaveURL(/\/onboarding\/1$/);

  // The (app) shell with its logout button comes later; this page already has one.
  await page.goto("/wachtwoord-wijzigen");
  await page.getByRole("button", { name: "Uitloggen" }).click();
  await expect(page).toHaveURL(/\/inloggen$/);

  await fillAndSubmit(page, username, "een-ander-wachtwoord", "Inloggen");
  await expect(page.getByText("Je gebruikersnaam of wachtwoord klopt niet.")).toBeVisible();

  await fillAndSubmit(page, username, password, "Inloggen");
  await expect(page).toHaveURL(/\/onboarding\/1$/);
});

for (const path of ["/inloggen", "/registreren"]) {
  test(`every script tag on ${path} has a nonce`, async ({ request }) => {
    const html = await (await request.get(path)).text();
    const tags = html.match(/<script\b[^>]*>/g) ?? [];
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) expect(tag).toMatch(/\snonce="[^"]+"/);
  });
}

// Served by the second web server in playwright.config.ts (SIGNUP_MODE=closed).
test.describe("signup closed", () => {
  test.use({ baseURL: "http://localhost:3001" });

  test("the register page says so", async ({ page }) => {
    await page.goto("/registreren");
    await expect(page.getByText("Registreren is nu gesloten.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Account maken" })).toHaveCount(0);
  });
});
