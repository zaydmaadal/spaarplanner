"use server";

import { z } from "zod";
import { goalSchema, idSchema, type ActionResult } from "@/data/schemas";
import { createServerSupabase, requireUserId } from "@/data/supabase/server";
import { potToken } from "@/lib/pot-token";
import { dbFailure, done, fail, invalid, SOMETHING_WRONG } from "./shared";

// Returns the id so the caller can chain setMainGoalAction for the first goal of a user.
// Full replace: optional fields that are left out reset to their defaults, so forms must send the whole object.
export async function saveGoalAction(input: z.input<typeof goalSchema>): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, kind, name, target, targetIsEstimate, deadline, weight } = parsed.data;

  // Kind and priority are set on creation only: a goal keeps its kind, and the order changes through reorderGoalsAction.
  const row = { name, target_cents: target, target_is_estimate: targetIsEstimate, deadline: deadline ? `${deadline}-01` : null, weight };
  const supabase = await createServerSupabase();
  if (id) {
    const { error } = await supabase.from("goals").update(row).eq("id", id).eq("user_id", userId);
    return error ? dbFailure(error) : done({ id });
  }

  // A new goal goes last (priority 1 is the highest). Two goals created at the same moment can share a priority;
  // the allocation breaks that tie on creation date and id.
  const { data: last, error: lastError } = await supabase
    .from("goals")
    .select("priority")
    .eq("user_id", userId)
    .order("priority", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) return dbFailure(lastError);
  // The colour is the next of the four pot colours by the number of goals the user has (archived ones count).
  const { count, error: countError } = await supabase.from("goals").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (countError) return dbFailure(countError);
  const { data, error } = await supabase
    .from("goals")
    .insert({ ...row, kind, user_id: userId, priority: (last?.priority ?? 0) + 1, color_token: potToken(count ?? 0) })
    .select("id")
    .single();
  return error ? dbFailure(error) : done({ id: data.id });
}

const orderSchema = z
  .array(idSchema)
  .min(1)
  .max(50)
  .refine((ids) => new Set(ids).size === ids.length);

// shortcut: one update per goal, not one transaction; a failure halfway leaves a mixed order that the next reorder fixes.
export async function reorderGoalsAction(ids: string[]): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!orderSchema.safeParse(ids).success) return fail(SOMETHING_WRONG);
  const supabase = await createServerSupabase();
  const results = await Promise.all(
    ids.map((id, i) => supabase.from("goals").update({ priority: i + 1 }).eq("id", id).eq("user_id", userId)),
  );
  const failed = results.find((r) => r.error);
  return failed?.error ? dbFailure(failed.error) : done();
}

// The target must be an active goal of the user, or the old main goal would be cleared for nothing. The unique index
// allows one main goal, so the old one is cleared first. shortcut: two writes, not one transaction; if the second fails the
// user has no main goal, and the overview falls back to the emergency fund until they pick one.
export async function setMainGoalAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!idSchema.safeParse(id).success) return fail(SOMETHING_WRONG);
  const supabase = await createServerSupabase();
  const target = await supabase.from("goals").select("id").eq("id", id).eq("user_id", userId).eq("status", "active").maybeSingle();
  if (target.error) return dbFailure(target.error);
  if (!target.data) return fail("Dit doel bestaat niet (meer).");
  const cleared = await supabase.from("goals").update({ is_main: false }).eq("user_id", userId).eq("is_main", true);
  if (cleared.error) return dbFailure(cleared.error);
  const { error } = await supabase.from("goals").update({ is_main: true }).eq("id", id).eq("user_id", userId);
  return error ? dbFailure(error) : done();
}

// shortcut: the balance is read before the update, so a deposit booked in between slips through; the money stays
// on the archived pot and unarchiving shows it again.
export async function archiveGoalAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!idSchema.safeParse(id).success) return fail(SOMETHING_WRONG);
  const supabase = await createServerSupabase();
  const [goal, balance] = await Promise.all([
    supabase.from("goals").select("kind").eq("id", id).eq("user_id", userId).maybeSingle(),
    supabase.from("goal_balances").select("balance_cents").eq("goal_id", id).eq("user_id", userId).maybeSingle(),
  ]);
  const readError = goal.error ?? balance.error;
  if (readError) return dbFailure(readError);
  if (!goal.data) return fail("Dit doel bestaat niet meer.");
  if (goal.data.kind === "emergency") return fail("Je noodfonds kan je niet archiveren.");
  if ((balance.data?.balance_cents ?? 0) > 0) return fail("Haal eerst het geld uit deze pot of verplaats het.");

  const { error } = await supabase.from("goals").update({ status: "archived", is_main: false }).eq("id", id).eq("user_id", userId);
  return error ? dbFailure(error) : done();
}

export async function unarchiveGoalAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!idSchema.safeParse(id).success) return fail(SOMETHING_WRONG);
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("goals").update({ status: "active" }).eq("id", id).eq("user_id", userId);
  return error ? dbFailure(error) : done();
}

// Removes the goal and, through the foreign key (on delete cascade), all of its transactions. The emergency fund stays:
// the plan reserves a share for it, and a user has exactly one. The own-row policy keeps this to the user's goals.
export async function deleteGoalAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!idSchema.safeParse(id).success) return fail(SOMETHING_WRONG);
  const supabase = await createServerSupabase();
  const goal = await supabase.from("goals").select("kind").eq("id", id).eq("user_id", userId).maybeSingle();
  if (goal.error) return dbFailure(goal.error);
  if (!goal.data) return fail("Dit doel bestaat niet meer.");
  if (goal.data.kind === "emergency") return fail("Je noodfonds kan je niet verwijderen.");

  const { error } = await supabase.from("goals").delete().eq("id", id).eq("user_id", userId);
  return error ? dbFailure(error) : done();
}
