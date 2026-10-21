import { expect, test, type Page } from "@playwright/test";
import { adminClient, at, next, register, skip } from "./helpers";

const rand = () => Math.random().toString(36).slice(2, 8);
const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

// "Reisvol rond mei 2027" -> a number that grows with the month
function monthOf(text: string) {
  const found = /vol rond (\w+) (\d{4})/.exec(text);
  if (!found) throw new Error(`No fill month in "${text}"`);
  return Number(found[2]) * 12 + MONTHS.indexOf(found[1]);
}

// Haider (spec 3) through the real onboarding: € 2.150 paid on the 29th, no costs, so the savings are the proposal of
// € 430, and a trip of € 2.500 by next July next to the emergency fund.
async function onboardHaider(page: Page, username: string) {
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
  await next(page, 5);
  await skip(page, 6);
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
}

test("the overview shows Haider's numbers in the order of spec 8.3", async ({ page }) => {
  await onboardHaider(page, `overzicht-${rand()}`);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hoi Haider");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Reis", "Verdeling van je loon", "Je potten", "Wat als?", "Volgende stappen"]);
  await expect(page.getByText("Volgende loondag", { exact: true })).toBeVisible();

  // "Tegelijk" gives the trip its share from the first period, so the main goal does not wait for the emergency fund.
  const main = page.getByRole("region", { name: "Reis" });
  await expect(main).toContainText("Hoofddoel");
  await expect(main).not.toContainText("Krijgt nu nog niets");
  const split = page.getByRole("region", { name: "Verdeling van je loon" });
  await expect(split).toContainText("Netto per maand");
  await expect(split).toContainText("€ 2.150,00");
  const pots = page.getByRole("region", { name: "Je potten" });
  await expect(pots).toContainText("Noodfonds");
  await expect(pots).toContainText("vol rond");
  await expect(page.getByRole("region", { name: "Volgende stappen" })).toContainText("Zet € 430,00 opzij");
});

test("the simulator moves the fill month, keeps trials to itself and stores only a chosen amount", async ({ page }) => {
  const username = `sim-${rand()}`;
  await onboardHaider(page, username);

  const sim = page.getByRole("region", { name: "Wat als?" });
  const savings = sim.getByRole("slider", { name: "Sparen per maand" });
  const apply = sim.getByRole("button", { name: "Zo instellen" });
  const trip = sim.getByRole("listitem").filter({ hasText: "Reis" });

  // Untouched: the proposal of 20 %, and nothing to store.
  await expect(savings).toHaveAttribute("aria-valuetext", "€ 430,00");
  await expect(apply).toBeDisabled();
  const before = await trip.innerText();

  // Extra income is only a trial: the savings follow, but there is still nothing to store.
  const extra = sim.getByRole("slider", { name: "Extra inkomen per maand" });
  await extra.focus();
  await extra.press("End");
  await expect(savings).toHaveAttribute("aria-valuetext", "€ 1.430,00");
  await expect(apply).toBeDisabled();

  // Choosing an amount: the trip is full earlier, and now there is something to store.
  await savings.focus();
  await savings.press("End");
  await expect(savings).toHaveAttribute("aria-valuetext", "€ 2.000,00");
  await expect(trip).not.toHaveText(before);
  expect(monthOf(await trip.innerText())).toBeLessThan(monthOf(before));
  await expect(apply).toBeEnabled();

  await apply.click();
  await expect(page.getByText("Je plan is aangepast.")).toBeVisible();

  const admin = adminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("username", username).single();
  expect(profile).not.toBeNull();
  const { data: plan } = await admin.from("plans").select("*").eq("user_id", profile?.id ?? "").single();
  // The extra income was a trial; the payment mode was not touched.
  expect(plan).toMatchObject({ monthly_savings_cents: 200000, income_mode: "normal" });

  // What is stored is what the sliders show, so there is nothing left to store.
  await expect(apply).toBeDisabled();
  await expect(page.getByRole("region", { name: "Volgende stappen" })).toContainText("Zet € 2.000,00 opzij");
});
