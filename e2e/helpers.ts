import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export const password = "een-lang-wachtwoord";

// The forms only work once React has hydrated (CSP blocks the pre-hydration submit), so a click before that does nothing.
// Next keeps the previous page mounted but hidden (React Activity), so check every form and fill only the visible one.
export const hydrated = (page: Page) =>
  page.waitForFunction(
    () =>
      document.forms.length > 0 &&
      Array.from(document.forms).every((form) => Object.keys(form).some((k) => k.startsWith("__reactProps"))),
  );

export async function fillAndSubmit(page: Page, username: string, pw: string, button: string) {
  await hydrated(page);
  const form = page.locator("form").filter({ visible: true });
  await form.getByLabel("Gebruikersnaam", { exact: true }).fill(username);
  await form.getByLabel("Wachtwoord", { exact: true }).fill(pw);
  await form.getByRole("button", { name: button }).click();
}

export async function register(page: Page, username: string) {
  await page.goto("/registreren");
  await fillAndSubmit(page, username, password, "Account maken");
}

// Next keeps the previous step mounted but hidden (React Activity): wait until the step's form is hydrated and only
// look at the visible form.
export async function at(page: Page, step: number) {
  await expect(page).toHaveURL(new RegExp(`/onboarding/${step}$`));
  await hydrated(page);
  return page.locator("form").filter({ visible: true });
}
export const next = async (page: Page, step: number) => (await at(page, step)).getByRole("button", { name: "Volgende" }).click();
export const skip = async (page: Page, step: number) => (await at(page, step)).getByRole("button", { name: "Overslaan" }).click();

const need = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set to run these e2e tests`);
  return value;
};

const client = (key: string) =>
  createClient(need("NEXT_PUBLIC_SUPABASE_URL"), key, { auth: { persistSession: false, autoRefreshToken: false } });
// A visitor's view of the Auth API: the publishable key and no stored session.
export const publicClient = () => client(need("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"));
// Service role: reads what a test must check in the database; never for the steps a user takes.
export const adminClient = () => client(need("SUPABASE_SECRET_KEY"));

const emailOf = (username: string) => `${username}@${need("NEXT_PUBLIC_AUTH_EMAIL_DOMAIN")}`;

// Creates a user through the admin API instead of the register form. The sign-up trigger still
// makes a profile; CI raises SIGNUP_HOURLY_CAP so these do not count against the form's cap.
export async function createUser(username: string, pw: string) {
  const { data, error } = await adminClient().auth.admin.createUser({
    email: emailOf(username),
    password: pw,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

// A finished onboarding for Haider (spec 3), written in the shapes of the onboarding steps and completeOnboardingAction:
// 2.150 euro on the 29th and no costs (so the savings are the proposal of 430 euro), "Tegelijk" (50 %), the emergency fund
// at its estimated 1.000 euro and a trip of 2.500 euro due in 12 months, which is on track. Nothing is booked yet.
// A fixed distance to the deadline keeps the numbers the same whatever day the tests run.
export async function seedHaider(username: string) {
  const id = await createUser(username, password);
  const admin = adminClient();
  const now = new Date();
  const deadline = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 12, 1)).toISOString().slice(0, 10);
  const writes = await Promise.all([
    admin.from("profiles").update({ display_name: "Haider", onboarding_step: 8, onboarding_completed_at: now.toISOString() }).eq("id", id),
    admin.from("income_sources").insert({
      user_id: id,
      name: "Netto inkomen",
      kind: "salary",
      frequency: "monthly",
      amount_cents: 215000,
      payday_rule: { type: "day_of_month", day: 29, weekend: "before" },
    }),
    admin.from("plans").update({ emergency_share_pct: 50 }).eq("user_id", id),
    // A multi-row insert sends missing keys as NULL, not as the column default, so both rows name every column.
    admin.from("goals").insert([
      { user_id: id, kind: "emergency", name: "Noodfonds", target_cents: 100000, target_is_estimate: true, deadline: null, priority: 1, is_main: false },
      { user_id: id, kind: "trip", name: "Reis", target_cents: 250000, target_is_estimate: false, deadline, priority: 2, is_main: true },
    ]),
  ]);
  for (const { error } of writes) if (error) throw error;
  return id;
}

// Signs in through the login form; a seeded user has finished the onboarding, so the overview is next.
export async function loginAs(page: Page, username: string) {
  await page.goto("/inloggen");
  await fillAndSubmit(page, username, password, "Inloggen");
  await expect(page).toHaveURL(/\/overzicht$/);
}

// A session through the API, like another device of the same user.
export const signIn = (username: string, pw: string) =>
  publicClient().auth.signInWithPassword({ email: emailOf(username), password: pw });

// The admin of /beheer has the fixed id in ADMIN_USER_IDS (set by CI). Safe to run again on a used database.
export const adminUsername = "beheerder";
export async function ensureAdmin() {
  const id = need("ADMIN_USER_IDS").split(",")[0].trim();
  const admin = adminClient();
  const { error } = await admin.auth.admin.createUser({
    id,
    email: emailOf(adminUsername),
    password,
    email_confirm: true,
  });
  if (error && !(await admin.auth.admin.getUserById(id)).data.user) throw error;
}

// Every <script> tag of the HTML the server sends for this path carries a nonce (the proxy's CSP only allows nonced scripts).
// With a page's `request` the cookies of its context go along, so this also checks a logged-in request.
export async function expectNoncedScripts(request: APIRequestContext, path: string) {
  const html = await (await request.get(path)).text();
  const tags = html.match(/<script\b[^>]*>/g) ?? [];
  expect(tags.length, `scripts on ${path}`).toBeGreaterThan(0);
  for (const tag of tags) expect(tag, `a script on ${path}`).toMatch(/\snonce="[^"]+"/);
}
