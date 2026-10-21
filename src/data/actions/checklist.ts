"use server";

import { z } from "zod";
import { idSchema, type ActionResult } from "@/data/schemas";
import { createServerSupabase, requireUserId } from "@/data/supabase/server";
import { dbFailure, done, fail, invalid, SOMETHING_WRONG } from "./shared";

const titleSchema = z.string().trim().min(1, "Vul een titel in.").max(200, "Kies een titel van hoogstens 200 tekens.");
// Rule keys (spec 5.8): a word, optionally followed by ":" and a date or id.
const closeSchema = z.object({ key: z.string().regex(/^[a-z_]{1,40}(:[0-9a-zA-Z-]{1,36})?$/), how: z.enum(["done", "dismissed"]) });

// Rule items are computed on render and never stored while open. Closing one stores a row for its key, so the same key
// does not come back. Its title is not kept (rule titles hold amounts and dates that go stale), but the column is required.
export async function closeRuleItemAction(key: string, how: "done" | "dismissed"): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = closeSchema.safeParse({ key, how });
  if (!parsed.success) return invalid(parsed.error);

  const now = new Date().toISOString();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("checklist_items").upsert(
    { user_id: userId, rule_key: key, title: key, source: "rule", ...(how === "done" ? { done_at: now } : { dismissed_at: now }) },
    { onConflict: "user_id,rule_key" },
  );
  return error ? dbFailure(error) : done();
}

export async function addChecklistItemAction(title: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = titleSchema.safeParse(title);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("checklist_items").insert({ user_id: userId, title: parsed.data, source: "user" });
  return error ? dbFailure(error) : done();
}

export async function toggleChecklistItemAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!idSchema.safeParse(id).success) return fail(SOMETHING_WRONG);
  const supabase = await createServerSupabase();
  const { data, error: readError } = await supabase.from("checklist_items").select("done_at").eq("id", id).eq("user_id", userId).maybeSingle();
  if (readError) return dbFailure(readError);
  if (!data) return fail("Dit item bestaat niet meer.");
  const { error } = await supabase
    .from("checklist_items")
    .update({ done_at: data.done_at ? null : new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  return error ? dbFailure(error) : done();
}
