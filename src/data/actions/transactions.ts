"use server";

import { z } from "zod";
import { transactionSchema, type ActionResult, type TransactionInput } from "@/data/schemas";
import { createServerSupabase, requireUserId } from "@/data/supabase/server";
import { dbFailure, done, fail, invalid } from "./shared";

const batchSchema = z.array(transactionSchema).min(1).max(50); // 50 is the goal cap: one deposit per pot

// One upsert for the whole batch. client_ref makes a retry harmless: rows that are already stored are skipped,
// new rows of the same batch are still written.
export async function addTransactionsAction(items: TransactionInput[]): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = batchSchema.safeParse(items);
  if (!parsed.success) return invalid(parsed.error);
  const txs = parsed.data;
  const supabase = await createServerSupabase();

  // A pot cannot go below 0 (spec 6). Rows stored by an earlier try do not count again, or a retried withdrawal that
  // emptied the pot would be refused. shortcut: check then write, so two withdrawals at the same moment can overdraw;
  // a database-side check would need a migration.
  if (txs.some((t) => t.direction === "out")) {
    const [balances, stored] = await Promise.all([
      supabase.from("goal_balances").select("goal_id, balance_cents").eq("user_id", userId).in("goal_id", [...new Set(txs.map((t) => t.goalId))]),
      supabase.from("transactions").select("client_ref").eq("user_id", userId).in("client_ref", txs.map((t) => t.clientRef)),
    ]);
    if (balances.error) return dbFailure(balances.error);
    if (stored.error) return dbFailure(stored.error);
    const known = new Set(stored.data.map((r) => r.client_ref));
    const after = new Map(balances.data.map((r) => [String(r.goal_id), r.balance_cents ?? 0]));
    for (const t of txs) {
      if (!known.has(t.clientRef)) after.set(t.goalId, (after.get(t.goalId) ?? 0) + (t.direction === "out" ? -t.amount : t.amount));
    }
    if ([...after.values()].some((cents) => cents < 0)) return fail("Je kan niet meer opnemen dan er in de pot zit.");
  }

  const { error } = await supabase.from("transactions").upsert(
    txs.map((t) => ({
      user_id: userId,
      goal_id: t.goalId,
      amount_cents: t.direction === "out" ? -t.amount : t.amount,
      occurred_on: t.occurredOn,
      note: t.note || null,
      source: "manual",
      client_ref: t.clientRef,
    })),
    { onConflict: "user_id,client_ref", ignoreDuplicates: true },
  );
  // Fallback: a duplicate client_ref also means "saved by an earlier try".
  if (error && !(error.code === "23505" && error.message.includes("client_ref"))) return dbFailure(error);
  return done();
}
