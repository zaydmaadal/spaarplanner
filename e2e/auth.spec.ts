import { expect, test } from "@playwright/test";
import { expectNoncedScripts, fillAndSubmit, hydrated, password, publicClient } from "./helpers";

test("register, log out, log in", async ({ page }) => {
  const username = `haider-${Math.random().toString(36).slice(2, 8)}`;

  await page.goto("/registreren");
  await fillAndSubmit(page, username, password, "Account maken");
  await expect(page).toHaveURL(/\/onboarding\/1$/);

  // The (app) shell with its logout button comes later; the change-password page already has one.
  await page.goto("/wachtwoord-wijzigen");
  await hydrated(page); // the logout form first unsubscribes from push in the browser
  await page.getByRole("button", { name: "Uitloggen" }).click();
  await expect(page).toHaveURL(/\/inloggen$/);

  await fillAndSubmit(page, username, "een-ander-wachtwoord", "Inloggen");
  await expect(page.getByText("Je gebruikersnaam of wachtwoord klopt niet.")).toBeVisible();

  await fillAndSubmit(page, username, password, "Inloggen");
  await expect(page).toHaveURL(/\/onboarding\/1$/);
});

// The logged-in pages are checked in a11y.spec.ts, which already has a signed-in context.
for (const path of ["/inloggen", "/registreren", "/privacy"]) {
  test(`every script tag on ${path} has a nonce`, ({ request }) => expectNoncedScripts(request, path));
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

// The register form is not the only way in: the Auth API itself must refuse sign-ups too.
test("signing up straight through the Auth API is switched off", async () => {
  const { error } = await publicClient().auth.signUp({
    email: `nep-${Math.random().toString(36).slice(2, 8)}@u.zaydmaadal.site`,
    password,
  });
  expect(error?.code).toBe("signup_disabled");
});
