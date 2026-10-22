import { expect, test } from "@playwright/test";
import { createUser, fillAndSubmit, password } from "./helpers";

// ADMIN_USER_IDS holds only the fixed admin of the recovery test, so this random user is a non-admin.
test("a signed-in non-admin gets the same 404 on /beheer as on any unknown path", async ({ page }) => {
  const username = `lezer-${Math.random().toString(36).slice(2, 8)}`;
  await createUser(username, password);

  await page.goto("/inloggen");
  await fillAndSubmit(page, username, password, "Inloggen");
  await expect(page).toHaveURL(/\/onboarding\/1$/);

  expect((await page.goto("/bestaat-niet"))?.status()).toBe(404);
  expect((await page.goto("/beheer"))?.status()).toBe(404);
  expect((await page.goto("/beheer/iets"))?.status()).toBe(404);
});
