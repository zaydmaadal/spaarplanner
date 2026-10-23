"use server";

import type { z } from "zod";
import type { Json, TablesUpdate } from "@/data/database.types";
import { profileSchema, type ActionResult } from "@/data/schemas";
import { createServerSupabase, requireUserId } from "@/data/supabase/server";
import { dbFailure, done, invalid } from "./shared";

const PREF_KEYS = {
  palette: "palette",
  theme: "theme",
  ziekenfonds: "ziekenfonds",
  noInterestSavings: "no_interest_savings",
  contextNote: "context_note",
  startBalance: "start_balance_cents",
  emergencyTarget: "emergency_target_cents",
} as const;

export async function saveProfileAction(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { displayName, prefs } = parsed.data;

  const supabase = await createServerSupabase();
  const patch: TablesUpdate<"profiles"> = {};
  if (displayName !== undefined) patch.display_name = displayName || null;
  if (prefs) {
    // Merge into the stored jsonb so context_note and the other keys survive. shortcut: read then write, so two
    // tabs saving prefs at the same moment can lose one change; use a jsonb merge in an RPC if that ever happens.
    const { data, error } = await supabase.from("profiles").select("prefs").eq("id", userId).single();
    if (error) return dbFailure(error);
    const merged: { [key: string]: Json | undefined } = typeof data.prefs === "object" && !Array.isArray(data.prefs) ? { ...data.prefs } : {};
    for (const [key, value] of Object.entries(prefs)) {
      if (value !== undefined) merged[PREF_KEYS[key as keyof typeof PREF_KEYS]] = value;
    }
    patch.prefs = merged;
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  return error ? dbFailure(error) : done();
}
