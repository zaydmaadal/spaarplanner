import { expect, test } from "@playwright/test";
import { hydrated, loginAs, seedHaider } from "./helpers";

const rand = () => Math.random().toString(36).slice(2, 8);

test("a rule step explains itself behind an info icon and can be hidden for good", async ({ page }) => {
  const username = `plan-${rand()}`;
  await seedHaider(username);
  await loginAs(page, username);
  await page.goto("/plan");
  await hydrated(page);

  const step = "Overschrijving klaarzetten";
  await expect(page.getByText("Meer uitleg")).toHaveCount(0);
  await page.getByRole("button", { name: `Uitleg: ${step}`, exact: true }).click();
  await expect(page.getByText("Zet een automatische overschrijving klaar op je loondag")).toBeVisible();
  await page.getByRole("button", { name: `Verberg: ${step}`, exact: true }).click();
  await expect(page.getByText("Verborgen.")).toBeVisible();
  await expect(page.getByText(step, { exact: true })).toHaveCount(0);
});

test("Profiel has a way to give feedback and a Je naam page without a repeated label", async ({ page }) => {
  const username = `prof-${rand()}`;
  await seedHaider(username);
  await loginAs(page, username);
  await page.goto("/meer");
  await hydrated(page);

  await expect(page.getByRole("heading", { level: 1, name: "Profiel", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Feedback geven", exact: true })).toHaveAttribute("href", "/meer/feedback");
  await page.getByRole("link", { name: "Je naam", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Je naam", exact: true })).toBeVisible();
  await expect(page.getByLabel("Voornaam of bijnaam")).toHaveValue("Haider");
});
