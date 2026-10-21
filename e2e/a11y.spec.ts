import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { expectNoncedScripts, loginAs, register, seedHaider } from "./helpers";

// Accessibility (axe: no serious or critical violation) and the CSP nonce, page by page. A sign-in is expensive (GoTrue
// allows about 30 per 5 minutes per IP), so each test signs in at most once and visits several pages.
// The page is checked once its h1 shows: before that it is loading.tsx or the previous screen, not the page under test.

const rand = () => Math.random().toString(36).slice(2, 8);

async function check(page: Page, path: string, h1: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1, name: h1, exact: true })).toBeVisible();
  await expectNoViolations(page, path);
  await expectNoncedScripts(page.request, path); // the page's request carries the cookies of the signed-in context
}

async function expectNoViolations(page: Page, where: string) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => ({ rule: v.id, impact: v.impact, in: v.nodes.map((n) => n.target) })), `axe on ${where}`).toEqual([]);
}

test("the pages without a session", async ({ page }) => {
  await check(page, "/inloggen", "Inloggen");
  await check(page, "/registreren", "Account maken");
  await check(page, "/privacy", "Privacy");
});

test("an onboarding step", async ({ page }) => {
  await register(page, `a11y-${rand()}`); // registered, not onboarded: signed in on /onboarding/1
  await check(page, "/onboarding/2", "Wat verdien je?");
});

test("the screens of the app", async ({ page }) => {
  const username = `a11y-${rand()}`;
  await seedHaider(username);
  await loginAs(page, username);

  await check(page, "/overzicht", "Hoi Haider");
  await check(page, "/doelen", "Doelen");
  await check(page, "/storten", "Storten");
  await check(page, "/plan", "Plan");
  await check(page, "/meer", "Meer");

  // Next keeps the screens you left mounted but hidden. Their ids and landmarks must not clash with the visible one.
  await test.step("after moving between the tabs, with the earlier screens hidden", async () => {
    const tab = (name: string) => page.getByRole("link", { name, exact: true });
    for (const [name, path, h1] of [
      ["Overzicht", /\/overzicht$/, "Hoi Haider"],
      ["Doelen", /\/doelen$/, "Doelen"],
      ["Plan", /\/plan$/, "Plan"],
      ["Meer", /\/meer$/, "Meer"],
    ] as const) {
      await tab(name).click();
      await expect(page).toHaveURL(path);
      await expect(page.getByRole("heading", { level: 1, name: h1, exact: true })).toBeVisible();
      await expectNoViolations(page, `${name} after the other tabs`);
    }
  });
});
