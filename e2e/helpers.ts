import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

export const password = "een-lang-wachtwoord";

// The forms only work once React has hydrated (CSP blocks the pre-hydration submit), so a click before that does nothing.
export const hydrated = (page: Page) =>
  page.waitForFunction(() => Object.keys(document.forms[0] ?? {}).some((k) => k.startsWith("__reactProps")));

export async function fillAndSubmit(page: Page, username: string, pw: string, button: string) {
  await hydrated(page);
  await page.getByLabel("Gebruikersnaam").fill(username);
  await page.getByLabel("Wachtwoord").fill(pw);
  await page.getByRole("button", { name: button }).click();
}

const need = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set to create e2e users`);
  return value;
};

// Creates a user through the admin API instead of the register form. The sign-up trigger still
// makes a profile, and those count towards the form's cap of 5 new accounts per hour, so create few.
export async function createUser(username: string, pw: string) {
  const admin = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.auth.admin.createUser({
    email: `${username}@${need("NEXT_PUBLIC_AUTH_EMAIL_DOMAIN")}`,
    password: pw,
    email_confirm: true,
  });
  if (error) throw error;
}
