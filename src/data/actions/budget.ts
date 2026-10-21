"use server";

import type { z } from "zod";
import { budgetLineSchema, idSchema, type ActionResult } from "@/data/schemas";
import { createServerSupabase, requireUserId } from "@/data/supabase/server";
import { dbFailure, done, fail, invalid, SOMETHING_WRONG } from "./shared";

export async function saveBudgetLineAction(input: z.input<typeof budgetLineSchema>): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = budgetLineSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, amount, isEstimate, ...v } = parsed.data;

  const row = { kind: v.kind, category: v.category, name: v.name, amount_cents: amount, is_estimate: isEstimate };
  const supabase = await createServerSupabase();
  const { error } = id
    ? await supabase.from("budget_lines").update(row).eq("id", id).eq("user_id", userId)
    : await supabase.from("budget_lines").insert({ ...row, user_id: userId });
  return error ? dbFailure(error) : done();
}

export async function deleteBudgetLineAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!idSchema.safeParse(id).success) return fail(SOMETHING_WRONG);
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("budget_lines").delete().eq("id", id).eq("user_id", userId);
  return error ? dbFailure(error) : done();
}
