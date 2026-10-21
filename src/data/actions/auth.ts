"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminSupabase } from "@/data/supabase/admin";
import { createServerSupabase, requireUserId } from "@/data/supabase/server";
import { fieldErrorsFrom, passwordSchema, usernameSchema, type ActionResult } from "@/data/schemas";
import { usernameToEmail } from "@/lib/auth-email";
import { signupConfig } from "@/lib/env";

const MAX_NEW_ACCOUNTS_PER_HOUR = 5;
const SOMETHING_WRONG = "Er ging iets mis. Probeer het opnieuw.";

const registerSchema = z.object({ username: usernameSchema, password: passwordSchema });

export async function registerAction(input: {
  username: string;
  password: string;
  inviteCode?: string;
}): Promise<ActionResult> {
  const { mode, inviteCode } = signupConfig();
  if (mode === "closed") return { ok: false, error: "Registreren is nu gesloten." };
  if (mode === "invite" && input.inviteCode?.trim() !== inviteCode) {
    return { ok: false, error: "Deze uitnodigingscode klopt niet." };
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Controleer je gegevens.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { username, password } = parsed.data;

  const admin = createAdminSupabase();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if (countError) return { ok: false, error: SOMETHING_WRONG };
  // shortcut: count-then-create is not atomic, so a burst can pass the cap by a few; fine for an abuse brake.
  if ((count ?? 0) >= MAX_NEW_ACCOUNTS_PER_HOUR) {
    return { ok: false, error: "Er zijn net veel accounts aangemaakt. Probeer het over een uur opnieuw." };
  }

  const { error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
  });
  if (error?.code === "email_exists") {
    const taken = "Deze gebruikersnaam is al in gebruik.";
    return { ok: false, error: taken, fieldErrors: { username: taken } };
  }
  if (error) return { ok: false, error: SOMETHING_WRONG };
  return { ok: true, data: undefined };
}

export async function changePasswordAction(input: { password: string }): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(input.password);
  if (!parsed.success) {
    const message = parsed.error.issues[0].message;
    return { ok: false, error: message, fieldErrors: { password: message } };
  }

  const userId = await requireUserId();
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error?.code === "same_password") {
    const message = "Kies een ander wachtwoord dan je huidige.";
    return { ok: false, error: message, fieldErrors: { password: message } };
  }
  if (error) return { ok: false, error: SOMETHING_WRONG };

  // The flag lives in app_metadata, which users cannot edit themselves, so only the admin client may clear it.
  const { error: clearError } = await createAdminSupabase().auth.admin.updateUserById(userId, {
    app_metadata: { must_change_password: false },
  });
  if (clearError) return { ok: false, error: SOMETHING_WRONG };

  // New JWT without the flag, or the proxy keeps redirecting to /wachtwoord-wijzigen.
  await supabase.auth.refreshSession();
  return { ok: true, data: undefined };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createServerSupabase();
  // "local": sign out this device only, not the user's other devices.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/inloggen");
}
