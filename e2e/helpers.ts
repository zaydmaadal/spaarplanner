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
  if (!value) throw new Error(`${name} must be set to run these e2e tests`);
  return value;
};

const client = (key: string) =>
  createClient(need("NEXT_PUBLIC_SUPABASE_URL"), key, { auth: { persistSession: false, autoRefreshToken: false } });
// A visitor's view of the Auth API: the publishable key and no stored session.
export const publicClient = () => client(need("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"));
const adminClient = () => client(need("SUPABASE_SECRET_KEY"));

const emailOf = (username: string) => `${username}@${need("NEXT_PUBLIC_AUTH_EMAIL_DOMAIN")}`;

// Creates a user through the admin API instead of the register form. The sign-up trigger still
// makes a profile; CI raises SIGNUP_HOURLY_CAP so these do not count against the form's cap.
export async function createUser(username: string, pw: string) {
  const { error } = await adminClient().auth.admin.createUser({
    email: emailOf(username),
    password: pw,
    email_confirm: true,
  });
  if (error) throw error;
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
