"use server";

import type { z } from "zod";
import { feedbackSchema, type ActionResult } from "@/data/schemas";
import { createServerSupabase, requireUserId } from "@/data/supabase/server";
import { dbFailure, invalid } from "./shared";

// The own-row policy on the table keeps the row to the signed-in user. No revalidation: nothing in the app shows it.
export async function sendFeedbackAction(input: z.input<typeof feedbackSchema>): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { kind, message, page } = parsed.data;

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("feedback").insert({ user_id: userId, kind, message, page: page || null });
  return error ? dbFailure(error) : { ok: true, data: undefined };
}
