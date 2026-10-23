import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adminClient, adminUsername, createUser, fillAndSubmit, hydrated, loginAs, password, seedHaider } from "./helpers";

const rand = () => Math.random().toString(36).slice(2, 8);

// The cards fade in (.rise): axe measuring halfway through would see faded text.
test.use({ reducedMotion: "reduce" });

async function expectNoViolations(page: Page, where: string) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => ({ rule: v.id, impact: v.impact, in: v.nodes.map((n) => n.target) })), `axe on ${where}`).toEqual([]);
}

test("a user sends a bug report, and the admin sees it with who, when and where, filters it and marks it handled", async ({ page, browser }) => {
  test.slow();
  const username = `melder-${rand()}`;
  const id = await seedHaider(username);
  const message = `Storten lukt niet (${rand()})`;
  await loginAs(page, username);

  await test.step("an empty message is refused, a filled form is sent", async () => {
    await page.goto("/meer/feedback");
    await hydrated(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Feedback geven");
    await expectNoViolations(page, "/meer/feedback");
    await page.getByRole("button", { name: "Versturen", exact: true }).click();
    await expect(page.getByText("Schrijf eerst je bericht.", { exact: true })).toBeVisible();

    await page.getByText("Bug", { exact: true }).click();
    await page.getByLabel("Wat ging er mis?", { exact: true }).fill(message);
    await page.getByLabel("Op welke pagina", { exact: true }).fill("Storten");
    await page.getByRole("button", { name: "Versturen", exact: true }).click();
    await expect(page.getByText("Bedankt, we hebben je bericht ontvangen.", { exact: true })).toBeVisible();
    const { data } = await adminClient().from("feedback").select("kind, message, page, handled_at").eq("user_id", id);
    expect(data).toEqual([{ kind: "bug", message, page: "Storten", handled_at: null }]);
  });

  // The admin in a fresh context: another person on another device.
  const context = await browser.newContext();
  const adminPage = await context.newPage();
  await adminPage.goto("/inloggen");
  await fillAndSubmit(adminPage, adminUsername, password, "Inloggen");
  await expect(adminPage).toHaveURL(/\/onboarding\/1$/);

  await test.step("the admin sees kind, who, page and message, and the Bugs filter keeps it", async () => {
    await adminPage.goto("/beheer");
    await hydrated(adminPage);
    const item = adminPage.getByRole("listitem").filter({ hasText: message });
    await expect(item).toContainText("Bug");
    await expectNoViolations(adminPage, "/beheer");
    await expect(item).toContainText(username);
    await expect(item).toContainText("Pagina: Storten");
    await adminPage.getByRole("link", { name: "Feedback", exact: true }).click();
    await expect(adminPage).toHaveURL(/soort=feedback$/);
    await expect(adminPage.getByRole("listitem").filter({ hasText: message })).toHaveCount(0);
    await adminPage.getByRole("link", { name: "Bugs", exact: true }).click();
    await expect(adminPage).toHaveURL(/soort=bug$/);
    await expect(adminPage.getByRole("listitem").filter({ hasText: message })).toBeVisible();
  });

  await test.step("marking it handled and opening it again", async () => {
    const item = adminPage.getByRole("listitem").filter({ hasText: message });
    await item.getByRole("button", { name: "Afgehandeld", exact: true }).click();
    await expect(item.getByRole("button", { name: "Heropenen", exact: true })).toBeVisible();
    expect((await adminClient().from("feedback").select("handled_at").eq("user_id", id).single()).data?.handled_at).not.toBeNull();
    await item.getByRole("button", { name: "Heropenen", exact: true }).click();
    await expect(item.getByRole("button", { name: "Afgehandeld", exact: true })).toBeVisible();
  });
  await context.close();
});

test("a plain user gets a 404 on /beheer", async ({ page }) => {
  const username = `lezer-${rand()}`;
  await createUser(username, password);
  await page.goto("/inloggen");
  await fillAndSubmit(page, username, password, "Inloggen");
  await expect(page).toHaveURL(/\/onboarding\/1$/);
  expect((await page.goto("/beheer"))?.status()).toBe(404);
});

test("the goal screen and its delete dialog have no serious accessibility violations", async ({ page }) => {
  const username = `a11y-${rand()}`;
  await seedHaider(username);
  await loginAs(page, username);
  await page.getByRole("link", { name: "Doelen", exact: true }).click();
  await page.getByRole("link", { name: "Reis", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Reis", exact: true })).toBeVisible();
  await expectNoViolations(page, "a goal");
  await page.getByRole("button", { name: "Verwijderen", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoViolations(page, "the delete dialog");
});
