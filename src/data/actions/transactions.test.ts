import { beforeEach, describe, expect, it, vi } from "vitest";
import { args, fakeDb, has, type Call } from "@/data/test-helpers";

const m = vi.hoisted(() => ({ db: undefined as unknown, revalidatePath: vi.fn(), signedOut: false }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/data/supabase/server", () => ({
  requireUserId: async () => {
    if (m.signedOut) throw new Error("NEXT_REDIRECT"); // the real one redirects to /inloggen, which throws
    return "user-1";
  },
  createServerSupabase: async () => m.db,
}));

import { addTransactionsAction } from "./transactions";

const GOAL = "3f2b1c9e-7d4a-4e8b-9c1d-2a6f5e0b8d71";
const REF_1 = "0b1c2d3e-4f50-4a61-8b72-93a4b5c6d7e8";
const REF_2 = "1c2d3e4f-5061-4b72-9c83-a4b5c6d7e8f9";
const NOT_ENOUGH = "Je kan niet meer opnemen dan er in de pot zit.";

const tx = (over: object = {}) => ({ goalId: GOAL, amount: "60", direction: "out" as const, occurredOn: "2026-10-21", clientRef: REF_1, ...over });

// Pot balance in cents, refs that are stored already, and what the write answers.
function setup({ balance = 5000, stored = [] as string[], write = {} as { error?: { code?: string; message?: string } } } = {}) {
  const db = fakeDb((call: Call) => {
    if (call.table === "goal_balances") return { data: [{ goal_id: GOAL, balance_cents: balance }] };
    if (has(call, "upsert")) return write;
    if (call.table === "transactions") return { data: stored.map((client_ref) => ({ client_ref })) };
  });
  m.db = db.client;
  return db.calls;
}
const upsert = (calls: Call[]) => calls.find((c) => has(c, "upsert"));

beforeEach(() => {
  vi.resetAllMocks();
  m.signedOut = false;
});

describe("addTransactionsAction", () => {
  it("does no database call without a session and lets the redirect propagate", async () => {
    const calls = setup();
    m.signedOut = true;
    await expect(addTransactionsAction([tx()])).rejects.toThrow("NEXT_REDIRECT");
    expect(calls).toHaveLength(0);
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses a withdrawal of 60 euro from a pot that holds 50 euro, and writes nothing", async () => {
    const calls = setup({ balance: 5000 });
    expect(await addTransactionsAction([tx()])).toEqual({ ok: false, error: NOT_ENOUGH });
    expect(upsert(calls)).toBeUndefined();
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("allows a withdrawal of exactly the balance, and counts a deposit in the same batch", async () => {
    setup({ balance: 5000 });
    expect(await addTransactionsAction([tx({ amount: "50" })])).toMatchObject({ ok: true });
    const calls = setup({ balance: 5000 });
    expect(await addTransactionsAction([tx({ amount: "70" }), tx({ amount: "20", direction: "in", clientRef: REF_2 })])).toMatchObject({ ok: true });
    expect(upsert(calls)).toBeDefined();
  });

  it("writes one upsert that ignores duplicates on user_id and client_ref, with signed cents and the session user", async () => {
    const calls = setup({ balance: 9000 });
    const result = await addTransactionsAction([
      { ...tx({ note: "  Verjaardag  " }), user_id: "someone-else", userId: "someone-else" } as ReturnType<typeof tx>,
      tx({ amount: "12,50", direction: "in", clientRef: REF_2 }),
    ]);
    expect(result).toEqual({ ok: true, data: undefined });
    expect(calls.filter((c) => has(c, "upsert"))).toHaveLength(1);
    expect(args(upsert(calls)!, "upsert")).toEqual([
      [
        { user_id: "user-1", goal_id: GOAL, amount_cents: -6000, occurred_on: "2026-10-21", note: "Verjaardag", source: "manual", client_ref: REF_1 },
        { user_id: "user-1", goal_id: GOAL, amount_cents: 1250, occurred_on: "2026-10-21", note: null, source: "manual", client_ref: REF_2 },
      ],
      { onConflict: "user_id,client_ref", ignoreDuplicates: true },
    ]);
    expect(m.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("does not read balances for a batch of deposits", async () => {
    const calls = setup();
    await addTransactionsAction([tx({ direction: "in" })]);
    expect(calls.map((c) => c.table)).toEqual(["transactions"]);
  });

  it("treats a retried withdrawal as a no-op success even though the pot is already emptied by it", async () => {
    const calls = setup({ balance: 0, stored: [REF_1] });
    expect(await addTransactionsAction([tx({ amount: "50" })])).toMatchObject({ ok: true });
    expect(upsert(calls)).toBeDefined(); // the database ignores the duplicate
  });

  it("still checks the new rows of a mixed batch", async () => {
    setup({ balance: 0, stored: [REF_1] });
    expect(await addTransactionsAction([tx({ amount: "50" }), tx({ amount: "10", clientRef: REF_2 })])).toEqual({ ok: false, error: NOT_ENOUGH });
  });

  it("maps a duplicate client_ref (23505) to success", async () => {
    setup({
      balance: 9000,
      write: { error: { code: "23505", message: 'duplicate key value violates unique constraint "transactions_user_id_client_ref_key"' } },
    });
    expect(await addTransactionsAction([tx()])).toMatchObject({ ok: true });
    expect(m.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("does not map another unique violation or error to success", async () => {
    setup({ balance: 9000, write: { error: { code: "23505", message: 'duplicate key value violates unique constraint "transactions_pkey"' } } });
    expect(await addTransactionsAction([tx()])).toEqual({ ok: false, error: "Er ging iets mis. Probeer het opnieuw." });
  });

  it("says the maximum is reached when the row cap trigger fires", async () => {
    setup({ balance: 9000, write: { error: { code: "23514", message: "row limit reached for transactions" } } });
    expect(await addTransactionsAction([tx()])).toEqual({ ok: false, error: "Je hebt het maximum bereikt. Verwijder eerst iets." });
  });

  it("rejects bad input before touching the database", async () => {
    const calls = setup();
    for (const bad of [[], [tx({ amount: "0" })], [tx({ goalId: "x" })], [tx({ occurredOn: "morgen" })], "nope", null]) {
      const result = await addTransactionsAction(bad as never);
      expect(result.ok).toBe(false);
    }
    expect(calls).toHaveLength(0);
  });
});
