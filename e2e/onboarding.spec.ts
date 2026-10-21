import { expect, test } from "@playwright/test";
import { adminClient, at, next, register, skip } from "./helpers";

// These tests check where onboarding ends (the overview), what that screen shows first, and what ended up in the database.

const rand = () => Math.random().toString(36).slice(2, 8);

// Reads with the service role; the user's own pages never do.
async function stored(username: string) {
  const admin = adminClient();
  const { data: profile } = await admin.from("profiles").select("*").eq("username", username).single();
  expect(profile).not.toBeNull();
  const id: string = profile.id;
  const [goals, plan, transactions, lines, checklist] = await Promise.all([
    admin.from("goals").select("*").eq("user_id", id).order("priority"),
    admin.from("plans").select("*").eq("user_id", id).single(),
    admin.from("transactions").select("*").eq("user_id", id),
    admin.from("budget_lines").select("*").eq("user_id", id),
    admin.from("checklist_items").select("*").eq("user_id", id),
  ]);
  return { profile, goals: goals.data ?? [], plan: plan.data, transactions: transactions.data ?? [], lines: lines.data ?? [], checklist: checklist.data ?? [] };
}

test("Haider: income, a trip with a deadline and the emergency fund next to it", async ({ page }) => {
  const username = `haider-${rand()}`;
  await register(page, username);

  let form = await at(page, 1);
  await form.getByLabel("Je naam", { exact: true }).fill("Haider");
  await next(page, 1);

  form = await at(page, 2);
  await form.getByLabel("Netto bedrag", { exact: true }).fill("2150");
  await form.getByLabel("Dag van de maand", { exact: true }).fill("29");
  await next(page, 2);

  await skip(page, 3);
  await skip(page, 4);

  // No expenses: the proposal is 20 % of the income. Keeping it must not store it.
  form = await at(page, 5);
  await expect(form.getByLabel("Dit wil ik sparen", { exact: true })).toHaveValue("430");
  await next(page, 5);

  await skip(page, 6);

  // "Next July": the coming July, or next year's when it is July or later.
  const now = new Date();
  const year = now.getUTCMonth() >= 6 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  form = await at(page, 7);
  await form.getByRole("button", { name: "Reis", pressed: false }).click();
  await form.getByLabel("Doelbedrag", { exact: true }).fill("2500");
  await form.getByLabel("Klaar tegen (optioneel)", { exact: true }).fill(`${year}-07`);
  await form.getByText("Tegelijk", { exact: true }).click();
  await next(page, 7);

  form = await at(page, 8);
  await form.getByRole("button", { name: "Naar mijn overzicht" }).click();
  await expect(page).toHaveURL(/\/overzicht$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hoi Haider");
  await expect(page.getByText("Volgende loondag", { exact: true })).toBeVisible();

  const { profile, goals, plan, transactions } = await stored(username);
  expect(profile).toMatchObject({ display_name: "Haider", onboarding_step: 8 });
  expect(profile.onboarding_completed_at).not.toBeNull();
  expect(goals).toMatchObject([
    { kind: "emergency", name: "Noodfonds", target_cents: 100000, target_is_estimate: true, priority: 1, is_main: false },
    { kind: "trip", name: "Reis", target_cents: 250000, target_is_estimate: false, deadline: `${year}-07-01`, priority: 2, is_main: true },
  ]);
  expect(plan).toMatchObject({ emergency_share_pct: 50, monthly_savings_cents: null });
  expect(transactions).toHaveLength(0);
});

test("skipping every step still ends on the overview with an estimated emergency fund", async ({ page }) => {
  const username = `skip-${rand()}`;
  await register(page, username);
  for (let step = 1; step <= 8; step++) await skip(page, step);
  await expect(page).toHaveURL(/\/overzicht$/);
  // No payday, so no strip; the emergency fund is the main goal, at the estimated € 1.000.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Volgende loondag", { exact: true })).toHaveCount(0);
  const fund = page.getByRole("region", { name: "Noodfonds" });
  await expect(fund).toContainText("€\u00a01.000,00");
  await expect(fund.getByText("schatting", { exact: true })).toBeVisible();

  const { profile, goals, plan, transactions } = await stored(username);
  expect(profile.onboarding_completed_at).not.toBeNull();
  expect(goals).toMatchObject([{ kind: "emergency", target_cents: 100000, target_is_estimate: true }]);
  expect(plan).toMatchObject({ emergency_share_pct: 100, monthly_savings_cents: null });
  expect(transactions).toHaveLength(0);
});

test("a reload resumes at the saved step; the start balance is booked once, the surplus goes to the main goal", async ({ page }) => {
  const username = `resume-${rand()}`;
  await register(page, username);
  await skip(page, 1);
  await skip(page, 2);
  await skip(page, 3);

  let form = await at(page, 4);
  await form.getByRole("button", { name: "Huur", pressed: false }).click();
  await form.getByLabel("Bedrag per maand", { exact: true }).fill("550");
  await next(page, 4);
  await skip(page, 5);

  form = await at(page, 6);
  await form.getByLabel("Hoeveel spaargeld heb je nu?", { exact: true }).fill("6000");
  await next(page, 6);
  await at(page, 7);

  // Back at the entry point, and with a step that does not exist: both land on the saved step.
  await page.goto("/");
  await at(page, 7);
  await page.goto("/onboarding/9");
  await at(page, 7);

  // The answers of step 6 are stored although the emergency fund does not exist yet.
  await page.goto("/onboarding/6");
  form = await at(page, 6);
  await expect(form.getByLabel("Hoeveel spaargeld heb je nu?", { exact: true })).toHaveValue("6000");
  await expect(form.getByLabel("Doelbedrag voor je noodfonds", { exact: true })).toHaveValue("1650");
  await next(page, 6);

  // The first goal is the main goal: it gets what is over, up to its own target (€ 6.000 - € 1.650 = € 4.350, the laptop needs € 1.000).
  form = await at(page, 7);
  await form.getByRole("button", { name: "Laptop", pressed: false }).click();
  await form.getByRole("button", { name: "Stage vinden", pressed: false }).click();
  await next(page, 7);

  // A double click on the last button must still book once.
  form = await at(page, 8);
  await form.getByRole("button", { name: "Naar mijn overzicht" }).dblclick();
  await expect(page).toHaveURL(/\/overzicht$/);

  const { profile, goals, transactions, lines, checklist } = await stored(username);
  expect(profile.onboarding_completed_at).not.toBeNull();
  expect(lines).toMatchObject([{ kind: "fixed", name: "Huur", amount_cents: 55000 }]);
  expect(goals).toMatchObject([
    { kind: "emergency", target_cents: 165000, target_is_estimate: true },
    { kind: "purchase", name: "Laptop", target_cents: 100000, is_main: true },
  ]);
  expect(transactions).toHaveLength(2);
  expect(transactions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ goal_id: goals[0].id, amount_cents: 165000, source: "start" }),
      expect.objectContaining({ goal_id: goals[1].id, amount_cents: 100000, source: "start" }),
    ]),
  );
  // The answers of step 6 have done their job.
  expect(profile.prefs).not.toHaveProperty("start_balance_cents");
  expect(profile.prefs).not.toHaveProperty("emergency_target_cents");
  expect(checklist).toMatchObject([{ title: "Stage vinden", source: "user" }]);
});
