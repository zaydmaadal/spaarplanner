"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/data/supabase/admin";
import { requireAdmin } from "@/data/supabase/server";
import { idSchema, usernameSchema, type ActionResult } from "@/data/schemas";

const SOMETHING_WRONG = "Er ging iets mis. Probeer het opnieuw.";

// 32 symbols without look-alikes (no I, O, 0, 1): the password is read aloud or typed from a screen.
// 32 divides 256, so `byte & 31` is uniform: 16 characters x 5 bits = 80 bits, no modulo bias.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomPassword = () => Array.from(randomBytes(16), (b) => ALPHABET[b & 31]).join("");

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

  const tempPassword = randomPassword();
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

// Marks a feedback row as handled, or open again. Admin only, through the service role: users cannot update the table.
export async function setFeedbackHandledAction(input: { id: string; handled: boolean }): Promise<ActionResult> {
  await requireAdmin();
  const id = idSchema.safeParse(input?.id);
  if (!id.success) return { ok: false, error: SOMETHING_WRONG };

  const { error } = await createAdminSupabase()
    .from("feedback")
    .update({ handled_at: input.handled ? new Date().toISOString() : null })
    .eq("id", id.data);
  if (error) return { ok: false, error: SOMETHING_WRONG };
  revalidatePath("/beheer");
  return { ok: true, data: undefined };
}
