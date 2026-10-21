"use server";

import type { z } from "zod";
import { planSchema, type ActionResult } from "@/data/schemas";
import { createServerSupabase, requireUserId } from "@/data/supabase/server";
import { dbFailure, done, invalid } from "./shared";

// Only the fields that are given are written; see planSchema for why a proposed savings amount never gets here.
export async function savePlanAction(input: z.input<typeof planSchema>): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { monthlySavings, emergencySharePct, incomeMode, includeOneOffIncome } = parsed.data;

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("plans")
    .update({
      monthly_savings_cents: monthlySavings,
      emergency_share_pct: emergencySharePct,
      income_mode: incomeMode,
      include_one_off_income: includeOneOffIncome,
    })
    .eq("user_id", userId);
  return error ? dbFailure(error) : done();
}
