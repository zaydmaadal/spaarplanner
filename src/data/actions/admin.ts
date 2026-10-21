"use server";

import { randomBytes } from "node:crypto";
import { notFound } from "next/navigation";
import { createAdminSupabase } from "@/data/supabase/admin";
import { requireUserId } from "@/data/supabase/server";
import { usernameSchema, type ActionResult } from "@/data/schemas";
import { serverEnv } from "@/lib/env";

const SOMETHING_WRONG = "Er ging iets mis. Probeer het opnieuw.";

// Non-admins get a 404, so the page does not reveal that it exists.
export async function requireAdmin(): Promise<string> {
  const userId = await requireUserId();
  if (!serverEnv().adminUserIds.includes(userId)) notFound();
  return userId;
}

export async function resetPasswordAction(input: { username: string }): Promise<ActionResult<{ tempPassword: string }>> {
  // Server actions are callable directly, so the page check is not enough.
  const adminId = await requireAdmin();

  // A malformed name cannot exist either, so it gets the same answer as an unknown one.
  const notFoundResult = { ok: false, error: "Geen gebruiker met die naam." } as const;
  const username = usernameSchema.safeParse(input?.username);
  if (!username.success) return notFoundResult;

  const admin = createAdminSupabase();
  const { data: profile, error: lookupError } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username.data)
    .maybeSingle();
  if (lookupError) return { ok: false, error: SOMETHING_WRONG };
  if (!profile) return notFoundResult;

  // 12 random bytes are exactly 16 base64url characters (A-Z a-z 0-9 - _), without padding.
  const tempPassword = randomBytes(12).toString("base64url");
  const { error } = await admin.auth.admin.updateUserById(profile.id, {
    password: tempPassword,
    app_metadata: { must_change_password: true },
  });
  if (error) return { ok: false, error: SOMETHING_WRONG };

  // Fail closed: without an audit row the password is not shown. Nobody knows it, so a retry sets a new one.
  const { error: auditError } = await admin
    .from("admin_audit")
    .insert({ admin_id: adminId, target_user_id: profile.id, action: "password_reset" });
  if (auditError) return { ok: false, error: SOMETHING_WRONG };

  return { ok: true, data: { tempPassword } };
}
