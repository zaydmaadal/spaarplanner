"use server";

import { createAdminSupabase } from "@/data/supabase/admin";
import { createServerSupabase, requireClaims } from "@/data/supabase/server";
import { verifyPassword } from "@/data/supabase/verify-password";
import type { ActionResult } from "@/data/schemas";
import { fail, SOMETHING_WRONG } from "./shared";

const WRONG = "Dit wachtwoord klopt niet.";
const wrongPassword = (): ActionResult => ({ ok: false, error: WRONG, fieldErrors: { password: WRONG } });

// Spec 7: the password again, then the auth user goes and every table follows through on delete cascade.
export async function deleteAccountAction(input: { password: string }): Promise<ActionResult> {
  const claims = await requireClaims();
  if (typeof input.password !== "string" || !input.password) return wrongPassword();

  const check = await verifyPassword(claims.email!, input.password);
  if (check === "wrong") return wrongPassword();
  if (check === "error") return fail(SOMETHING_WRONG);

  const { error } = await createAdminSupabase().auth.admin.deleteUser(claims.sub);
  if (error) return fail(SOMETHING_WRONG);

  // The JWT of a deleted user stays valid until it expires, so clear the cookies now.
  const supabase = await createServerSupabase();
  await supabase.auth.signOut({ scope: "local" });
  return { ok: true, data: undefined };
}
