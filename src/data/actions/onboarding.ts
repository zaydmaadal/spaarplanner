"use server";

import { z } from "zod";
import { MAX_CENTS, type ActionResult } from "@/data/schemas";
import { createServerSupabase, requireUserId } from "@/data/supabase/server";
import { suggestedEmergencyTarget } from "@/domain/budget";
import { todayInTimeZone } from "@/domain/dates";
import { potToken } from "@/lib/pot-token";
import { dbFailure, done, fail, invalid, SOMETHING_WRONG } from "./shared";

// done() would refresh the layout, which re-renders the onboarding page; that page redirects once onboarding is finished,
// and Next would then turn the redirect into the answer of this action. The caller navigates itself, so nothing is refreshed.
const FINISHED: ActionResult = { ok: true, data: undefined };

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
// shortcut: the writes are not one transaction, so a failure halfway leaves a fund without its start balance until the
// retry; move it into a database function if retries turn out to be painful.
export async function completeOnboardingAction(input: z.input<typeof completeSchema>): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = completeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { emergencyTargetCents, startBalanceCents, emergencySharePct } = parsed.data;

  const supabase = await createServerSupabase();
  const [profile, goals, lines] = await Promise.all([
    supabase.from("profiles").select("onboarding_completed_at, timezone, prefs").eq("id", userId).single(),
    supabase.from("goals").select("id, kind, priority, target_cents, is_main").eq("user_id", userId),
    supabase.from("budget_lines").select("amount_cents").eq("user_id", userId),
  ]);
  if (!profile.data || !goals.data || !lines.data) return dbFailure(profile.error ?? goals.error ?? lines.error ?? {});
  if (profile.data.onboarding_completed_at) return FINISHED;

  let fund = goals.data.find((g) => g.kind === "emergency");
  if (!fund) {
    const target = emergencyTargetCents ?? suggestedEmergencyTarget(lines.data.reduce((sum, l) => sum + l.amount_cents, 0));
    // The fund is priority 1 (like the personas); the goals of step 7 move one place down.
    const moved = await Promise.all(goals.data.map((g) => supabase.from("goals").update({ priority: g.priority + 1 }).eq("id", g.id).eq("user_id", userId)));
    const moveError = moved.find((r) => r.error)?.error;
    if (moveError) return dbFailure(moveError);

    const created = await supabase
      .from("goals")
      .insert({ user_id: userId, kind: "emergency", name: "Noodfonds", target_cents: target, target_is_estimate: emergencyTargetCents === null, priority: 1, color_token: potToken(goals.data.length) })
      .select("id, kind, priority, target_cents, is_main")
      .single();
    if (created.data) fund = created.data;
    else if (created.error?.code === "23505") {
      // A parallel submit created the fund between our read and our insert (unique index goals_one_emergency).
      const existing = await supabase.from("goals").select("id, kind, priority, target_cents, is_main").eq("user_id", userId).eq("kind", "emergency").single();
      if (!existing.data) return dbFailure(existing.error ?? {});
      fund = existing.data;
    } else return dbFailure(created.error ?? {});
  }

  // Spec 8.2 step 6: savings above the fund's target go to the main goal (step 7), up to what that goal needs.
  // shortcut: whatever is left after that stays unbooked; add a transaction per goal when users ask for it.
  const toFund = Math.min(startBalanceCents, fund.target_cents);
  const main = goals.data.find((g) => g.is_main && g.kind !== "emergency");
  const today = todayInTimeZone(profile.data.timezone, new Date());
  const bookings = [
    { goalId: fund.id, cents: toFund },
    ...(main ? [{ goalId: main.id, cents: Math.min(startBalanceCents - toFund, main.target_cents) }] : []),
  ];
  // The goal's id is the client_ref, so each booking exists once however often this runs.
  for (const { goalId, cents } of bookings) {
    if (cents <= 0) continue;
    const { error } = await supabase.from("transactions").upsert(
      { user_id: userId, goal_id: goalId, amount_cents: cents, occurred_on: today, note: "Startsaldo", source: "start", client_ref: goalId },
      { onConflict: "user_id,client_ref", ignoreDuplicates: true },
    );
    if (error) return dbFailure(error);
  }

  const plan = await supabase.from("plans").update({ emergency_share_pct: emergencySharePct }).eq("user_id", userId);
  if (plan.error) return dbFailure(plan.error);
  // The step 6 answers have done their job: drop them from the prefs.
  const prefs = typeof profile.data.prefs === "object" && profile.data.prefs !== null && !Array.isArray(profile.data.prefs) ? { ...profile.data.prefs } : {};
  delete prefs.start_balance_cents;
  delete prefs.emergency_target_cents;
  delete prefs.emergency_share_chosen;
  const { error } = await supabase.from("profiles").update({ onboarding_step: 8, onboarding_completed_at: new Date().toISOString(), prefs }).eq("id", userId);
  return error ? dbFailure(error) : FINISHED;
}
