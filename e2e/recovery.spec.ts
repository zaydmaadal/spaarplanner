import { expect, test, type Page } from "@playwright/test";
import { adminUsername, createUser, fillAndSubmit, hydrated, password, publicClient, signIn } from "./helpers";

const name = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
const newPassword = "een-nieuw-wachtwoord";

async function logIn(page: Page, username: string, pw: string) {
  await page.goto("/inloggen");
  await fillAndSubmit(page, username, pw, "Inloggen");
}

test("an admin reset gives a temporary password that must be changed", async ({ page }) => {
  test.slow();
  const username = name("herstel");
  await createUser(username, password);
  // Another device of the same user, opened before the reset.
  const before = (await signIn(username, password)).data.session!;

  // The admin resets the password on /beheer and reads the temporary one.
  await logIn(page, adminUsername, password);
  await expect(page).toHaveURL(/\/onboarding\/1$/);
  await page.goto("/beheer");
  await hydrated(page);
  await page.getByLabel("Gebruikersnaam").fill(username);
  await page.getByRole("button", { name: "Wachtwoord resetten" }).click();
  await expect(page.getByText("Tijdelijk wachtwoord")).toBeVisible();
  const temp = (await page.locator("code").innerText()).trim();

  // GoTrue v2.197 signs out every session of the user on an admin password update.
  const refreshed = await publicClient().auth.refreshSession({ refresh_token: before.refresh_token });
  expect(refreshed.error?.code).toBe("refresh_token_not_found");
  expect((await signIn(username, password)).error?.code).toBe("invalid_credentials");

  // With the temporary password the user can only get to the change-password page, and sets a new one there.
  await page.context().clearCookies();
  await logIn(page, username, temp);
  await expect(page).toHaveURL(/\/wachtwoord-wijzigen$/);
  await expect(page.getByLabel("Huidig wachtwoord")).toHaveCount(0);
  await hydrated(page);
  await page.getByLabel("Nieuw wachtwoord").fill(newPassword);
  await page.getByRole("button", { name: "Wachtwoord opslaan" }).click();
  await expect(page).toHaveURL(/\/onboarding\/1$/);

  expect((await signIn(username, temp)).error?.code).toBe("invalid_credentials");
  expect((await signIn(username, newPassword)).error).toBeNull();
});

test("a normal password change asks for the current password", async ({ page }) => {
  test.slow();
  const username = name("wijzig");
  await createUser(username, password);
  await logIn(page, username, password);
  await expect(page).toHaveURL(/\/onboarding\/1$/);

  await page.goto("/wachtwoord-wijzigen");
  await hydrated(page);
  await page.getByLabel("Huidig wachtwoord").fill("een-ander-wachtwoord");
  await page.getByLabel("Nieuw wachtwoord").fill(newPassword);
  await page.getByRole("button", { name: "Wachtwoord opslaan" }).click();
  await expect(page.getByText("Je huidige wachtwoord klopt niet.")).toBeVisible();
  expect((await signIn(username, newPassword)).error?.code).toBe("invalid_credentials");

  // React resets the form after an action, so both fields are empty again.
  await page.getByLabel("Huidig wachtwoord").fill(password);
  await page.getByLabel("Nieuw wachtwoord").fill(newPassword);
  await page.getByRole("button", { name: "Wachtwoord opslaan" }).click();
  await expect(page).toHaveURL(/\/onboarding\/1$/);
  expect((await signIn(username, newPassword)).error).toBeNull();
});
