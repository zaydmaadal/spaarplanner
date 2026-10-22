"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminSupabase } from "@/data/supabase/admin";
import { createServerSupabase, requireClaims } from "@/data/supabase/server";
import { fieldErrorsFrom, passwordSchema, usernameSchema, type ActionResult } from "@/data/schemas";
import { usernameToEmail } from "@/lib/auth-email";
import { publicEnv, signupConfig } from "@/lib/env";

const SOMETHING_WRONG = "Er ging iets mis. Probeer het opnieuw.";

const CAP_REACHED = "Er zijn net veel accounts aangemaakt. Probeer het over een uur opnieuw.";

const registerSchema = z.object({ username: usernameSchema, password: passwordSchema });

// Digests have equal length, which timingSafeEqual needs; a client can send any type, so check it.
const sha256 = (v: string) => createHash("sha256").update(v).digest();
const isInviteCode = (given: unknown, expected: string | null) =>
  typeof given === "string" && expected !== null && timingSafeEqual(sha256(given.trim()), sha256(expected));

const recentAccounts = (admin: ReturnType<typeof createAdminSupabase>) =>
  admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

export async function registerAction(input: {
  username: string;
  password: string;
  inviteCode?: string;
}): Promise<ActionResult> {
  const { mode, inviteCode, hourlyCap } = signupConfig();
  if (mode === "closed") return { ok: false, error: "Registreren is nu gesloten." };
  if (mode === "invite" && !isInviteCode(input.inviteCode, inviteCode)) {
    return { ok: false, error: "Deze uitnodigingscode klopt niet." };
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Controleer je gegevens.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { username, password } = parsed.data;

  const admin = createAdminSupabase();
  const { count, error: countError } = await recentAccounts(admin);
  if (countError) return { ok: false, error: SOMETHING_WRONG };
  if ((count ?? 0) >= hourlyCap) return { ok: false, error: CAP_REACHED };

  const { data, error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
  });
  if (error?.code === "email_exists") {
    const taken = "Deze gebruikersnaam is al in gebruik.";
    return { ok: false, error: taken, fieldErrors: { username: taken } };
  }
  if (error) return { ok: false, error: SOMETHING_WRONG };

  // Count again now that this account exists: parallel requests can all pass the first check.
  // Whoever sees more than the cap undoes their own account. If this count fails, keep the account.
  const { count: after } = await recentAccounts(admin);
  if ((after ?? 0) > hourlyCap) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, error: CAP_REACHED };
  }
  return { ok: true, data: undefined };
}

export async function changePasswordAction(input: { password: string; currentPassword?: string }): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(input.password);
  if (!parsed.success) {
    const message = parsed.error.issues[0].message;
    return { ok: false, error: message, fieldErrors: { password: message } };
  }

  const claims = await requireClaims();
  // After an admin reset the user just logged in with the temporary password, so it is not asked again.
  const forced = !!claims.app_metadata?.must_change_password;
  if (!forced) {
    const wrong = "Je huidige wachtwoord klopt niet.";
    if (typeof input.currentPassword !== "string" || !input.currentPassword) {
      return { ok: false, error: wrong, fieldErrors: { currentPassword: wrong } };
    }
    // A fresh client that stores nothing, so the cookie session of this user is left alone.
    const { error: verifyError } = await createClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }).auth.signInWithPassword({ email: claims.email!, password: input.currentPassword });
    if (verifyError?.code === "invalid_credentials") {
      return { ok: false, error: wrong, fieldErrors: { currentPassword: wrong } };
    }
    if (verifyError) return { ok: false, error: SOMETHING_WRONG };
  }

  // Before the password changes: a missing secret on a preview must not leave a half-done change.
  const admin = forced ? createAdminSupabase() : undefined;
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error?.code === "same_password") {
    const message = "Kies een ander wachtwoord dan je huidige.";
    return { ok: false, error: message, fieldErrors: { password: message } };
  }
  if (error) return { ok: false, error: SOMETHING_WRONG };

  if (admin) {
    // The flag lives in app_metadata, which users cannot edit themselves, so only the admin client may clear it.
    const { error: clearError } = await admin.auth.admin.updateUserById(claims.sub, {
      app_metadata: { must_change_password: false },
    });
    if (clearError) return { ok: false, error: SOMETHING_WRONG };

    // New JWT without the flag, or the proxy keeps redirecting to /wachtwoord-wijzigen.
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) return { ok: false, error: SOMETHING_WRONG };
  }
  return { ok: true, data: undefined };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createServerSupabase();
  // "local": sign out this device only, not the user's other devices.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/inloggen");
}
