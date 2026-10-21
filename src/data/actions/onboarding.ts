"use server";

import { z } from "zod";
import { MAX_CENTS, type ActionResult } from "@/data/schemas";
import { createServerSupabase, requireUserId } from "@/data/supabase/server";
import { suggestedEmergencyTarget } from "@/domain/budget";
import { todayInTimeZone } from "@/domain/dates";
import { dbFailure, done, fail, invalid, SOMETHING_WRONG } from "./shared";

// Only forward: going back a step and reloading still resumes at the furthest step reached.
export async function setOnboardingStepAction(step: number): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = z.number().int().min(1).max(8).safeParse(step);
  if (!parsed.success) return fail(SOMETHING_WRONG);
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("profiles").update({ onboarding_step: parsed.data }).eq("id", userId).lt("onboarding_step", parsed.data);
  return error ? dbFailure(error) : done();
}

const completeSchema = z.object({
  emergencyTargetCents: z.number().int().min(1).max(MAX_CENTS).nullable(),
  startBalanceCents: z.number().int().min(0).max(MAX_CENTS),
  emergencySharePct: z.union([z.literal(50), z.literal(100)]),
});

// Spec 8.2, after step 8. Safe to run twice: a finished onboarding answers ok, an existing fund is reused and the start
// balance has the fund's id as client_ref, so it is booked once. The profile is updated last, so a failure can be retried.
export async function completeOnboardingAction(input: z.input<typeof completeSchema>): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = completeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { emergencyTargetCents, startBalanceCents, emergencySharePct } = parsed.data;

  const supabase = await createServerSupabase();
  const [profile, goals, lines] = await Promise.all([
    supabase.from("profiles").select("onboarding_completed_at, timezone").eq("id", userId).single(),
    supabase.from("goals").select("id, kind, priority, target_cents").eq("user_id", userId),
    supabase.from("budget_lines").select("amount_cents").eq("user_id", userId),
  ]);
  if (!profile.data || !goals.data || !lines.data) return dbFailure(profile.error ?? goals.error ?? lines.error ?? {});
  if (profile.data.onboarding_completed_at) return done();

  let fund = goals.data.find((g) => g.kind === "emergency");
  if (!fund) {
    const target = emergencyTargetCents ?? suggestedEmergencyTarget(lines.data.reduce((sum, l) => sum + l.amount_cents, 0));
    // The fund is priority 1 (like the personas); the goals of step 7 move one place down.
    const moved = await Promise.all(goals.data.map((g) => supabase.from("goals").update({ priority: g.priority + 1 }).eq("id", g.id).eq("user_id", userId)));
    const moveError = moved.find((r) => r.error)?.error;
    if (moveError) return dbFailure(moveError);

    const created = await supabase
      .from("goals")
      .insert({ user_id: userId, kind: "emergency", name: "Noodfonds", target_cents: target, target_is_estimate: emergencyTargetCents === null, priority: 1 })
      .select("id, kind, priority, target_cents")
      .single();
    if (created.data) fund = created.data;
    else if (created.error?.code === "23505") {
      // A parallel submit created the fund between our read and our insert (unique index goals_one_emergency).
      const existing = await supabase.from("goals").select("id, kind, priority, target_cents").eq("user_id", userId).eq("kind", "emergency").single();
      if (!existing.data) return dbFailure(existing.error ?? {});
      fund = existing.data;
    } else return dbFailure(created.error ?? {});
  }

  // Savings above the target are not booked: the fund is full, the rest is for the goals (spec 8.2 step 6).
  const deposit = Math.min(startBalanceCents, fund.target_cents);
  if (deposit > 0) {
    const { error } = await supabase.from("transactions").upsert(
      { user_id: userId, goal_id: fund.id, amount_cents: deposit, occurred_on: todayInTimeZone(profile.data.timezone, new Date()), note: "Startsaldo", source: "start", client_ref: fund.id },
      { onConflict: "user_id,client_ref", ignoreDuplicates: true },
    );
    if (error) return dbFailure(error);
  }

  const plan = await supabase.from("plans").update({ emergency_share_pct: emergencySharePct }).eq("user_id", userId);
  if (plan.error) return dbFailure(plan.error);
  const { error } = await supabase.from("profiles").update({ onboarding_step: 8, onboarding_completed_at: new Date().toISOString() }).eq("id", userId);
  return error ? dbFailure(error) : done();
}
