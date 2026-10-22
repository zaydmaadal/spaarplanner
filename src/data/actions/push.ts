"use server";

import { z } from "zod";
import { pushSubscriptionSchema, type ActionResult } from "@/data/schemas";
import { createAdminSupabase } from "@/data/supabase/admin";
import { createServerSupabase, requireUserId } from "@/data/supabase/server";
import { fail, isRowCap, SOMETHING_WRONG } from "./shared";

const OK = { ok: true, data: undefined } as const;

export async function savePushSubscriptionAction(sub: PushSubscriptionJSON): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = pushSubscriptionSchema.safeParse(sub);
  if (!parsed.success) return fail(SOMETHING_WRONG);
  const { endpoint, keys } = parsed.data;

  // Delete, then insert, never upsert: the endpoint is unique over all users, and RLS hides another user's row from the
  // user client, so a shared device that changes account would be refused. The row cap trigger also fires before ON CONFLICT.
  const { error: deleteError } = await createAdminSupabase().from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (deleteError) return fail(SOMETHING_WRONG);

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("push_subscriptions")
    .insert({ user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth });
  if (!error) return OK;
  return fail(isRowCap(error) ? "Je kan meldingen op hoogstens 10 toestellen aanzetten." : SOMETHING_WRONG);
}

export async function removePushSubscriptionAction(endpoint: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!z.string().max(1000).safeParse(endpoint).success) return fail(SOMETHING_WRONG);
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", userId);
  return error ? fail(SOMETHING_WRONG) : OK;
}
