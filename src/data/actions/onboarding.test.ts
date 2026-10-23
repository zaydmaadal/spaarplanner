import { beforeEach, describe, expect, it, vi } from "vitest";
import { args, fakeDb, has, type Call } from "@/data/test-helpers";

const m = vi.hoisted(() => ({ db: undefined as unknown, revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/data/supabase/server", () => ({
  requireUserId: async () => "user-1",
  createServerSupabase: async () => m.db,
}));

import { completeOnboardingAction, setOnboardingStepAction } from "./onboarding";

const FUND = "3f2b1c9e-7d4a-4e8b-9c1d-2a6f5e0b8d71";
const TRIP = "0b1c2d3e-4f50-4a61-8b72-93a4b5c6d7e8";
type Goal = { id: string; kind: string; priority: number; target_cents: number; is_main?: boolean };
type DbError = { code: string; message: string };
type Setup = { completed?: boolean; prefs?: object; lines?: number[]; goals?: Goal[]; insertError?: DbError; raced?: Goal; writeError?: DbError };

// Reads answer from the options; the insert echoes the row it was given, like `.insert().select().single()`.
function setup({ completed = false, prefs = {}, lines = [], goals = [], insertError, raced, writeError }: Setup = {}) {
  const db = fakeDb((call: Call) => {
    if (call.table === "profiles" && has(call, "select")) return { data: { onboarding_completed_at: completed ? "2026-10-01T10:00:00Z" : null, timezone: "Europe/Brussels", prefs } };
    if (call.table === "budget_lines") return { data: lines.map((amount_cents) => ({ amount_cents })) };
    if (call.table === "goals" && has(call, "insert")) {
      const row = args(call, "insert")![0] as Goal;
      return insertError ? { error: insertError } : { data: { id: FUND, kind: row.kind, priority: row.priority, target_cents: row.target_cents } };
    }
    if (call.table === "goals" && has(call, "single")) return { data: raced };
    if (call.table === "goals" && has(call, "select")) return { data: goals };
    return writeError && call.table === "transactions" ? { error: writeError } : {};
  });
  m.db = db.client;
  return db.calls;
}
const on = (calls: Call[], table: string, op: string) => calls.filter((c) => c.table === table && has(c, op));
const finish = { emergencyTargetCents: null, startBalanceCents: 0, emergencySharePct: 100 as const };

beforeEach(() => vi.resetAllMocks());

describe("setOnboardingStepAction", () => {
  it("stores the step on the own row, and only when it moves forward", async () => {
    const calls = setup();
    expect(await setOnboardingStepAction(3)).toMatchObject({ ok: true });
    expect(args(calls[0], "update")).toEqual([{ onboarding_step: 3 }]);
    expect(calls[0].ops).toContainEqual(["eq", ["id", "user-1"]]);
    expect(calls[0].ops).toContainEqual(["lt", ["onboarding_step", 3]]);
  });

  it("refuses a step outside 1 to 8 without touching the database", async () => {
    const calls = setup();
    for (const bad of [0, 9, 2.5, Number.NaN]) expect((await setOnboardingStepAction(bad)).ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

describe("completeOnboardingAction", () => {
  it("proposes 3 times the monthly expenses as an estimate when step 6 gave no target", async () => {
    const calls = setup({ lines: [60000, 55000, 50000] }); // € 1.650
    expect(await completeOnboardingAction(finish)).toMatchObject({ ok: true });
    expect(args(on(calls, "goals", "insert")[0], "insert")).toEqual([
      { user_id: "user-1", kind: "emergency", name: "Noodfonds", target_cents: 495000, target_is_estimate: true, priority: 1, color_token: "pot-1" },
    ]);
  });

  it("falls back to € 1.000 as an estimate when everything was skipped, and books no start balance", async () => {
    const calls = setup();
    await completeOnboardingAction(finish);
    expect(args(on(calls, "goals", "insert")[0], "insert")![0]).toMatchObject({ target_cents: 100000, target_is_estimate: true });
    expect(on(calls, "transactions", "upsert")).toHaveLength(0);
  });

  it("keeps a target the user typed as exact", async () => {
    const calls = setup({ lines: [165000] });
    await completeOnboardingAction({ ...finish, emergencyTargetCents: 300000 });
    expect(args(on(calls, "goals", "insert")[0], "insert")![0]).toMatchObject({ target_cents: 300000, target_is_estimate: false });
  });

  it("books the start balance as one 'start' transaction, capped at the target and safe to repeat", async () => {
    const calls = setup({ lines: [165000] });
    await completeOnboardingAction({ ...finish, startBalanceCents: 600000 }); // € 6.000 on a € 4.950 target
    const [tx] = on(calls, "transactions", "upsert");
    expect(args(tx, "upsert")).toEqual([
      { user_id: "user-1", goal_id: FUND, amount_cents: 495000, occurred_on: expect.stringMatching(/^\d{4}-\d\d-\d\d$/), note: "Startsaldo", source: "start", client_ref: FUND },
      { onConflict: "user_id,client_ref", ignoreDuplicates: true },
    ]);
  });

  it("books a start balance below the target in full", async () => {
    const calls = setup({ lines: [165000] });
    await completeOnboardingAction({ ...finish, startBalanceCents: 120000 });
    expect(args(on(calls, "transactions", "upsert")[0], "upsert")![0]).toMatchObject({ amount_cents: 120000 });
  });

  it("puts the emergency fund first: the goals of step 7 move one place down", async () => {
    const calls = setup({ goals: [{ id: TRIP, kind: "trip", priority: 1, target_cents: 250000 }] });
    await completeOnboardingAction(finish);
    const [shift] = on(calls, "goals", "update");
    expect(args(shift, "update")).toEqual([{ priority: 2 }]);
    expect(shift.ops).toEqual(expect.arrayContaining([["eq", ["id", TRIP]], ["eq", ["user_id", "user-1"]]]));
  });

  it("stores the chosen share on the own plan and finishes last, with the step and the time", async () => {
    const calls = setup();
    await completeOnboardingAction({ ...finish, emergencySharePct: 50 });
    const [plan] = on(calls, "plans", "update");
    expect(args(plan, "update")).toEqual([{ emergency_share_pct: 50 }]);
    expect(plan.ops).toContainEqual(["eq", ["user_id", "user-1"]]);
    const last = calls.at(-1)!;
    expect(last.table).toBe("profiles");
    expect(args(last, "update")![0]).toEqual({ onboarding_step: 8, onboarding_completed_at: expect.stringMatching(/^\d{4}-\d\d-\d\dT/), prefs: {} });
    expect(last.ops).toContainEqual(["eq", ["id", "user-1"]]);
    // Refreshing would re-render /onboarding/8, which redirects now; the screen navigates itself.
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("clears the two step 6 answers from the prefs when it finishes, and keeps the other prefs", async () => {
    const calls = setup({ prefs: { palette: "smaragd", context_note: "Stage in maart", start_balance_cents: 600000, emergency_target_cents: 400000 } });
    await completeOnboardingAction(finish);
    expect(args(calls.at(-1)!, "update")![0]).toMatchObject({ prefs: { palette: "smaragd", context_note: "Stage in maart" } });
    expect(args(calls.at(-1)!, "update")![0]).not.toHaveProperty("prefs.start_balance_cents");
    expect(args(calls.at(-1)!, "update")![0]).not.toHaveProperty("prefs.emergency_target_cents");
  });

  describe("a start balance above the emergency target", () => {
    const MAIN = "0b1c2d3e-4f50-4a61-8b72-93a4b5c6d7e9";
    const main = (target_cents: number): Goal => ({ id: MAIN, kind: "trip", priority: 1, target_cents, is_main: true });
    const bookings = (calls: Call[]) => on(calls, "transactions", "upsert").map((c) => args(c, "upsert")!);

    it("books the surplus on the main goal as a second start transaction with the main goal's id as client_ref", async () => {
      const calls = setup({ goals: [main(250000)] });
      await completeOnboardingAction({ ...finish, startBalanceCents: 150000 }); // fund target € 1.000 (nothing spent), € 500 over
      expect(bookings(calls)).toEqual([
        [expect.objectContaining({ goal_id: FUND, amount_cents: 100000, client_ref: FUND }), { onConflict: "user_id,client_ref", ignoreDuplicates: true }],
        [
          { user_id: "user-1", goal_id: MAIN, amount_cents: 50000, occurred_on: expect.stringMatching(/^\d{4}-\d\d-\d\d$/), note: "Startsaldo", source: "start", client_ref: MAIN },
          { onConflict: "user_id,client_ref", ignoreDuplicates: true },
        ],
      ]);
    });

    it("books no more than the main goal still needs; the rest stays unbooked", async () => {
      const calls = setup({ goals: [main(20000)] });
      await completeOnboardingAction({ ...finish, startBalanceCents: 150000 });
      expect(bookings(calls).map(([row]) => (row as { amount_cents: number }).amount_cents)).toEqual([100000, 20000]);
    });

    it("books nothing extra when there is no main goal, or when nothing is over", async () => {
      const calls = setup({ goals: [{ ...main(250000), is_main: false }] });
      await completeOnboardingAction({ ...finish, startBalanceCents: 150000 });
      expect(bookings(calls)).toHaveLength(1);
      const exact = setup({ goals: [main(250000)] });
      await completeOnboardingAction({ ...finish, startBalanceCents: 100000 });
      expect(bookings(exact)).toHaveLength(1);
    });

    it("never takes the emergency fund for the main goal", async () => {
      const calls = setup({ goals: [{ id: FUND, kind: "emergency", priority: 1, target_cents: 100000, is_main: true }] });
      await completeOnboardingAction({ ...finish, startBalanceCents: 150000 });
      expect(bookings(calls)).toHaveLength(1);
    });
  });

  it("is idempotent: a finished onboarding answers ok and writes nothing", async () => {
    const calls = setup({ completed: true });
    expect(await completeOnboardingAction(finish)).toMatchObject({ ok: true });
    expect(calls.filter((c) => ["insert", "update", "upsert"].some((op) => has(c, op)))).toHaveLength(0);
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("reuses an existing emergency fund instead of failing on the unique index, and books against it", async () => {
    const calls = setup({ goals: [{ id: FUND, kind: "emergency", priority: 1, target_cents: 100000 }] });
    expect(await completeOnboardingAction({ ...finish, startBalanceCents: 20000 })).toMatchObject({ ok: true });
    expect(on(calls, "goals", "insert")).toHaveLength(0);
    expect(on(calls, "goals", "update")).toHaveLength(0);
    expect(args(on(calls, "transactions", "upsert")[0], "upsert")![0]).toMatchObject({ goal_id: FUND, amount_cents: 20000, client_ref: FUND });
  });

  it("reuses the fund of a parallel submit that won the race (23505 on the unique index)", async () => {
    const calls = setup({
      insertError: { code: "23505", message: 'duplicate key value violates unique constraint "goals_one_emergency"' },
      raced: { id: FUND, kind: "emergency", priority: 1, target_cents: 100000 },
    });
    expect(await completeOnboardingAction({ ...finish, startBalanceCents: 20000 })).toMatchObject({ ok: true });
    expect(args(on(calls, "transactions", "upsert")[0], "upsert")![0]).toMatchObject({ goal_id: FUND, client_ref: FUND });
  });

  it("does not hide another insert error", async () => {
    const calls = setup({ insertError: { code: "23514", message: "row limit reached for goals" } });
    expect(await completeOnboardingAction(finish)).toEqual({ ok: false, error: "Je hebt het maximum bereikt. Verwijder eerst iets." });
    expect(on(calls, "profiles", "update")).toHaveLength(0);
  });

  it("stops before finishing when a write fails, so the user can try again", async () => {
    const calls = setup({ writeError: { code: "XX000", message: "boom" }, lines: [100000] });
    expect(await completeOnboardingAction({ ...finish, startBalanceCents: 50000 })).toEqual({ ok: false, error: "Er ging iets mis. Probeer het opnieuw." });
    expect(on(calls, "profiles", "update")).toHaveLength(0);
  });

  it("rejects an unknown share, a negative amount and a zero target without a database call", async () => {
    const calls = setup();
    for (const bad of [{ emergencySharePct: 75 }, { startBalanceCents: -1 }, { emergencyTargetCents: 0 }, { startBalanceCents: 1.5 }]) {
      expect((await completeOnboardingAction({ ...finish, ...bad } as never)).ok).toBe(false);
    }
    expect(calls).toHaveLength(0);
  });
});
