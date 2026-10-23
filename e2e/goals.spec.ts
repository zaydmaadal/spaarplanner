import { expect, test, type Page } from "@playwright/test";
import { adminClient, hydrated, loginAs, seedHaider } from "./helpers";

// Haider is seeded (helpers.seedHaider): savings of 430 euro, split 215 and 215 over the emergency fund and the trip.
// Everything is found through the visible page: Next keeps the previous screens mounted but hidden. Each test signs in
// once (GoTrue limits sign-ins per IP), so a test is a few steps that build on each other.

const rand = () => Math.random().toString(36).slice(2, 8);

async function open(page: Page, path: string) {
  await page.goto(path);
  await hydrated(page);
  return page.locator("form").filter({ visible: true });
}

async function fillGoal(page: Page, name: string, target: string, deadline?: string) {
  const form = await open(page, "/doelen/nieuw");
  await form.getByLabel("Naam", { exact: true }).fill(name);
  await form.getByLabel("Doelbedrag", { exact: true }).fill(target);
  if (deadline) await form.getByLabel("Klaar tegen (optioneel)", { exact: true }).fill(deadline);
  return form;
}

test("new goals show their effect before they are saved: a laptop moves the trip, a passed deadline is not achievable", async ({ page }) => {
  const username = `doelen-${rand()}`;
  await seedHaider(username);
  await loginAs(page, username);

  await test.step("a goal without deadline: when it is full, which goal slips, and it is in the list", async () => {
    const form = await fillGoal(page, "Laptop", "1200");
    const preview = page.getByRole("region", { name: "Wat dit verandert", exact: true });
    await expect(preview).toContainText(/Klaar rond (jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec) \d{4}/);
    await expect(preview).toContainText(/Reis schuift \d+ maand(en)? op, van (jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec) \d{4} naar /);

    await form.getByRole("button", { name: "Doel opslaan", exact: true }).click();
    await expect(page).toHaveURL(/\/doelen$/);
    const laptop = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: "Laptop", exact: true }) });
    await expect(laptop).toContainText("vol rond");
  });

  await test.step("a deadline in the past: not achievable in the preview and on the goal", async () => {
    const form = await fillGoal(page, "Rijbewijs", "1500", "2020-01");
    const preview = page.getByRole("region", { name: "Wat dit verandert", exact: true });
    await expect(preview).toContainText("Niet haalbaar");
    await expect(preview.getByRole("button", { name: /Schuif de deadline naar/ })).toBeVisible();

    await form.getByRole("button", { name: "Doel opslaan", exact: true }).click();
    await expect(page).toHaveURL(/\/doelen$/);
    await page.getByRole("link", { name: "Rijbewijs", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rijbewijs");
    // The form is still mounted but hidden, so only look at what is visible.
    await expect(page.getByText("Niet haalbaar", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Schuif de deadline naar/ }).filter({ visible: true })).toBeVisible();
  });
});

test("a withdrawal larger than the balance is refused, and a deposit is booked once even on a double click", async ({ page }) => {
  const username = `storten-${rand()}`;
  const id = await seedHaider(username);
  await loginAs(page, username);
  const db = () => adminClient().from("transactions").select("amount_cents, source").eq("user_id", id);

  // The step on the overview and the deposit form name the same amount.
  await expect(page.getByRole("region", { name: "Volgende stappen", exact: true })).toContainText("Zet € 430,00 opzij");
  await page.getByRole("link", { name: "Storten", exact: true }).click();
  await expect(page).toHaveURL(/\/storten$/);
  await hydrated(page);
  const form = page.locator("form").filter({ visible: true });

  await test.step("an empty pot cannot be emptied further", async () => {
    // Choosing to withdraw clears the amounts: the deposits of this period are not something to take out.
    await form.getByText("Opnemen", { exact: true }).click();
    await expect(form.getByLabel("Reis", { exact: true })).toHaveValue("");
    await form.getByLabel("Reis", { exact: true }).fill("50");
    await form.getByRole("button", { name: "Opslaan", exact: true }).click();
    await expect(form.getByText("Je kan niet meer opnemen dan er in de pot zit.", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/storten$/);
    expect((await db()).data).toHaveLength(0);
  });

  await test.step("the prefilled amounts add up to the plan amount and are booked once", async () => {
    await form.getByText("Storten", { exact: true }).click();
    const values = await form.getByRole("textbox").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
    expect(values).toHaveLength(2);
    expect(values.reduce((sum, value) => sum + Math.round(Number(value.replace(",", ".")) * 100), 0)).toBe(43000);
    await expect(form).toContainText("Totaal");
    await expect(form).toContainText("€ 430,00");

    await form.getByRole("button", { name: "Opslaan", exact: true }).dblclick();
    await expect(page).toHaveURL(/\/overzicht$/);
    expect((await db()).data).toEqual([
      { amount_cents: 21500, source: "manual" },
      { amount_cents: 21500, source: "manual" },
    ]);
  });

  await test.step("the history of the trip shows its deposit once", async () => {
    await page.getByRole("link", { name: "Doelen", exact: true }).click();
    await page.getByRole("link", { name: "Reis", exact: true }).click();
    const history = page.getByRole("region", { name: "Geschiedenis", exact: true });
    await expect(history.getByRole("listitem")).toHaveCount(1);
    await expect(history).toContainText("€ 215,00");
  });
});

test("archiving a goal can be undone, and the goal is the main goal again", async ({ page }) => {
  const username = `archief-${rand()}`;
  const id = await seedHaider(username);
  await loginAs(page, username);
  await page.getByRole("link", { name: "Doelen", exact: true }).click();
  await page.getByRole("link", { name: "Reis", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reis");

  await page.getByRole("button", { name: "Archiveren", exact: true }).click();
  await expect(page).toHaveURL(/\/doelen$/);
  await expect(page.getByText("Pot gearchiveerd", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reis", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Ongedaan maken", exact: true }).click();
  await expect(page.getByRole("link", { name: "Reis", exact: true })).toBeVisible();
  await expect
    .poll(async () => (await adminClient().from("goals").select("status, is_main").eq("user_id", id).eq("name", "Reis").single()).data)
    .toEqual({ status: "active", is_main: true });
});
