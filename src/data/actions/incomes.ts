"use server";

import type { z } from "zod";
import { idSchema, incomeSchema, type ActionResult } from "@/data/schemas";
import { createServerSupabase, requireUserId } from "@/data/supabase/server";
import { dbFailure, done, fail, invalid, SOMETHING_WRONG } from "./shared";

// Full replace: optional fields that are left out reset to their defaults, so forms must send the whole object.
// Returns the id so a form that saves several rows can update, not insert again, when it has to try again.
export async function saveIncomeAction(input: z.input<typeof incomeSchema>): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = incomeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, amount, amountLow, paydayRule, ...v } = parsed.data;

  // The low amount only means something for variable income, the month for yearly and the date for one-off income.
  const row = {
    name: v.name,
    kind: v.kind,
    frequency: v.frequency,
    amount_cents: amount,
    amount_low_cents: v.variability === "variable" ? (amountLow ?? null) : null,
    variability: v.variability,
    month: v.frequency === "yearly" ? (v.month ?? null) : null,
    date: v.frequency === "once" ? (v.date ?? null) : null,
    payday_rule: paydayRule,
    is_estimate: v.isEstimate,
    active: v.active,
  };
  const supabase = await createServerSupabase();
  if (id) {
    const { error } = await supabase.from("income_sources").update(row).eq("id", id).eq("user_id", userId);
    return error ? dbFailure(error) : done({ id });
  }
  const { data, error } = await supabase.from("income_sources").insert({ ...row, user_id: userId }).select("id").single();
  return error ? dbFailure(error) : done({ id: data.id });
}

export async function deleteIncomeAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!idSchema.safeParse(id).success) return fail(SOMETHING_WRONG);
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("income_sources").delete().eq("id", id).eq("user_id", userId);
  return error ? dbFailure(error) : done();
}
