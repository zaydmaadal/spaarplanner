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

test("archiving asks first, can be undone, and an archived goal waits under Afgerond until it is put back", async ({ page }) => {
  const username = `archief-${rand()}`;
  const id = await seedHaider(username);
  await loginAs(page, username);
  await page.getByRole("link", { name: "Doelen", exact: true }).click();
  await page.getByRole("link", { name: "Reis", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reis");
  const stored = async () => (await adminClient().from("goals").select("status, is_main").eq("user_id", id).eq("name", "Reis").single()).data;

  await test.step("the dialog explains what archiving does", async () => {
    await page.getByRole("button", { name: "Archiveren", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Verbergt het doel, je geschiedenis blijft. Terugzetten kan bij Afgerond.");
    await page.getByRole("dialog").getByRole("button", { name: "Archiveren", exact: true }).click();
    await expect(page).toHaveURL(/\/doelen$/);
    await expect(page.getByText("Doel gearchiveerd", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reis", exact: true })).toHaveCount(0);
  });

  await test.step("the undo of the toast gives the main goal back", async () => {
    await page.getByRole("button", { name: "Ongedaan maken", exact: true }).click();
    await expect(page.getByRole("link", { name: "Reis", exact: true })).toBeVisible();
    await expect.poll(stored).toEqual({ status: "active", is_main: true });
  });

  await test.step("an archived goal is listed under Afgerond and comes back with Terugzetten", async () => {
    await page.getByRole("link", { name: "Reis", exact: true }).click();
    await page.getByRole("button", { name: "Archiveren", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Archiveren", exact: true }).click();
    await expect(page).toHaveURL(/\/doelen$/);
    await expect(page.getByRole("heading", { name: "Afgerond", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Reis terugzetten", exact: true }).click();
    await expect(page.getByRole("link", { name: "Reis", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Afgerond", exact: true })).toHaveCount(0);
    await expect.poll(async () => (await stored())?.status).toBe("active");
  });
});

test("deleting a goal names the amount that disappears and removes the goal with its history; the emergency fund stays", async ({ page }) => {
  const username = `verwijder-${rand()}`;
  const id = await seedHaider(username);
  const admin = adminClient();
  const { data: trip } = await admin.from("goals").select("id").eq("user_id", id).eq("name", "Reis").single();
  const { error } = await admin.from("transactions").insert({ user_id: id, goal_id: trip!.id, amount_cents: 5000, occurred_on: "2026-10-01", note: "Spaarpot", source: "manual", client_ref: crypto.randomUUID() });
  expect(error).toBeNull();
  await loginAs(page, username);

  await test.step("the emergency fund cannot be deleted or archived, and says why", async () => {
    await page.getByRole("link", { name: "Doelen", exact: true }).click();
    await page.getByRole("link", { name: "Noodfonds", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Noodfonds");
    await expect(page.getByRole("button", { name: "Verwijderen", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Archiveren", exact: true })).toHaveCount(0);
    await expect(page.getByText("Je noodfonds kan je niet archiveren of verwijderen", { exact: false })).toBeVisible();
  });

  await test.step("a goal with money: the dialog names the goal and the amount, cancelling changes nothing", async () => {
    await page.getByRole("link", { name: "Doelen", exact: true }).click();
    await page.getByRole("link", { name: "Reis", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reis");
    await page.getByRole("button", { name: "Verwijderen", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Reis verwijderen?");
    await expect(dialog).toContainText(/€\s50,00 die erin zit/);
    await dialog.getByRole("button", { name: "Annuleren", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect((await admin.from("goals").select("id").eq("id", trip!.id)).data).toHaveLength(1);
  });

  await test.step("confirming removes the goal and its transactions", async () => {
    await page.getByRole("button", { name: "Verwijderen", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Verwijderen", exact: true }).click();
    await expect(page).toHaveURL(/\/doelen$/);
    await expect(page.getByRole("link", { name: "Reis", exact: true })).toHaveCount(0);
    expect((await admin.from("goals").select("id").eq("id", trip!.id)).data).toHaveLength(0);
    expect((await admin.from("transactions").select("id").eq("goal_id", trip!.id)).data).toHaveLength(0);
  });
});

test("a deposit opened from a goal goes back to that goal, and the start balance is not called a deposit", async ({ page }) => {
  const username = `terug-${rand()}`;
  const id = await seedHaider(username);
  const admin = adminClient();
  const { data: fund } = await admin.from("goals").select("id").eq("user_id", id).eq("name", "Noodfonds").single();
  await admin.from("transactions").insert({ user_id: id, goal_id: fund!.id, amount_cents: 12000, occurred_on: "2026-10-01", note: "Startsaldo", source: "start", client_ref: crypto.randomUUID() });
  await loginAs(page, username);

  await test.step("the history reads Startbedrag", async () => {
    await page.getByRole("link", { name: "Doelen", exact: true }).click();
    await page.getByRole("link", { name: "Noodfonds", exact: true }).click();
    const history = page.getByRole("region", { name: "Geschiedenis", exact: true });
    await expect(history).toContainText("Startbedrag");
    await expect(history).not.toContainText("Storting");
  });

  await test.step("the back link of the deposit form returns to the goal", async () => {
    await page.getByRole("link", { name: "Doelen", exact: true }).click();
    await page.getByRole("link", { name: "Reis", exact: true }).click();
    await expect(page).toHaveURL(/\/doelen\/[0-9a-f-]+$/);
    const goalUrl = page.url();
    await page.locator('a[href^="/storten?pot="]:not([href*="soort"])').filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/storten\?pot=/);
    await page.getByRole("link", { name: "Terug naar Reis", exact: true }).click();
    await expect(page).toHaveURL(goalUrl);
  });

  await test.step("after saving, the success view goes back to the goal", async () => {
    await page.locator('a[href^="/storten?pot="]:not([href*="soort"])').filter({ visible: true }).click();
    await hydrated(page);
    const form = page.locator("form").filter({ visible: true });
    await form.getByRole("textbox", { name: "Reis", exact: true }).fill("25");
    await form.getByRole("button", { name: "Opslaan", exact: true }).click();
    await expect(page.getByRole("link", { name: "Terug naar het doel", exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/doelen\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reis");
  });
});

test("reordering the goals keeps the cards in place: the bars do not grow in again", async ({ page }) => {
  const username = `volgorde-${rand()}`;
  const id = await seedHaider(username);
  await loginAs(page, username);
  await page.getByRole("link", { name: "Doelen", exact: true }).click();
  const names = () => page.getByRole("heading", { level: 2 }).allInnerTexts();
  await expect.poll(names).toEqual(["Noodfonds", "Reis"]);
  const growing = () => page.evaluate(() => document.getAnimations().filter((a) => (a as CSSAnimation).animationName === "bar-fill" && a.playState === "running").length);
  await expect.poll(growing).toBe(0); // the first entry has played

  // Keyboard: focus the handle, pick up, one down, drop.
  await page.getByRole("button", { name: "Versleep Noodfonds", exact: true }).focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(150);
  await page.keyboard.press("Space");
  await expect.poll(names).toEqual(["Reis", "Noodfonds"]);
  await expect
    .poll(async () => (await adminClient().from("goals").select("name").eq("user_id", id).order("priority")).data?.map((g) => g.name))
    .toEqual(["Reis", "Noodfonds"]);
  await page.waitForTimeout(500); // the refresh after the save has come back by now
  expect(await growing()).toBe(0);
  expect(await names()).toEqual(["Reis", "Noodfonds"]);
});
