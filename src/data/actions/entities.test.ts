import { beforeEach, describe, expect, it, vi } from "vitest";
import { args, fakeDb, has, type Call } from "@/data/test-helpers";

const m = vi.hoisted(() => ({ db: undefined as unknown, revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/data/supabase/server", () => ({
  requireUserId: async () => "user-1",
  createServerSupabase: async () => m.db,
}));

import { deleteBudgetLineAction, saveBudgetLineAction } from "./budget";
import { addChecklistItemAction, closeRuleItemAction, toggleChecklistItemAction } from "./checklist";
import { deleteIncomeAction, saveIncomeAction } from "./incomes";

const ID = "3f2b1c9e-7d4a-4e8b-9c1d-2a6f5e0b8d71";
const CAP = { error: { code: "23514", message: "row limit reached for income_sources" } };
const owner = [["eq", ["user_id", "user-1"]]];

function setup(handler: (call: Call) => object | void = () => {}) {
  const db = fakeDb(handler);
  m.db = db.client;
  return db.calls;
}

beforeEach(() => vi.resetAllMocks());

const income = {
  name: "Salaris",
  kind: "salary" as const,
  frequency: "monthly" as const,
  amount: "2.150",
  paydayRule: { type: "day_of_month" as const, day: 29, weekend: "before" as const },
};

describe("incomes", () => {
  it("inserts with the session user and drops month, date and the low amount that do not apply", async () => {
    const calls = setup();
    expect(await saveIncomeAction({ ...income, amountLow: "1.800", month: 5, date: "2027-01-01", user_id: "x" } as typeof income)).toMatchObject({ ok: true });
    expect(args(calls[0], "insert")).toEqual([
      {
        user_id: "user-1",
        name: "Salaris",
        kind: "salary",
        frequency: "monthly",
        amount_cents: 215000,
        amount_low_cents: null,
        variability: "fixed",
        month: null,
        date: null,
        payday_rule: { type: "day_of_month", day: 29, weekend: "before" },
        is_estimate: false,
        active: true,
      },
    ]);
    expect(m.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("keeps the low amount of variable income and the month of yearly income", async () => {
    const calls = setup();
    await saveIncomeAction({ ...income, variability: "variable", amountLow: "1.800", frequency: "yearly", month: 12 });
    expect(args(calls[0], "insert")![0]).toMatchObject({ amount_low_cents: 180000, month: 12, date: null });
  });

  it("updates by id and owner, without writing user_id", async () => {
    const calls = setup();
    await saveIncomeAction({ ...income, id: ID });
    expect(args(calls[0], "update")![0]).not.toHaveProperty("user_id");
    expect(calls[0].ops.filter(([op]) => op === "eq")).toEqual([["eq", ["id", ID]], ...owner]);
  });

  it("says the maximum is reached at the row cap", async () => {
    setup(() => CAP);
    expect(await saveIncomeAction(income)).toEqual({ ok: false, error: "Je hebt het maximum bereikt. Verwijder eerst iets." });
  });

  it("deletes by id and owner", async () => {
    const calls = setup();
    expect(await deleteIncomeAction(ID)).toMatchObject({ ok: true });
    expect(has(calls[0], "delete")).toBe(true);
    expect(calls[0].ops.filter(([op]) => op === "eq")).toEqual([["eq", ["id", ID]], ...owner]);
    expect((await deleteIncomeAction("nope")).ok).toBe(false);
  });
});

describe("budget lines", () => {
  const line = { kind: "fixed" as const, category: "Wonen", name: "Huur", amount: "500" };

  it("inserts and updates like incomes", async () => {
    const calls = setup();
    await saveBudgetLineAction(line);
    expect(args(calls[0], "insert")).toEqual([
      { user_id: "user-1", kind: "fixed", category: "Wonen", name: "Huur", amount_cents: 50000, is_estimate: false },
    ]);
    await saveBudgetLineAction({ ...line, id: ID, isEstimate: true });
    expect(args(calls[1], "update")).toEqual([{ kind: "fixed", category: "Wonen", name: "Huur", amount_cents: 50000, is_estimate: true }]);
    expect(calls[1].ops).toContainEqual(["eq", ["user_id", "user-1"]]);
  });

  it("deletes by id and owner", async () => {
    const calls = setup();
    await deleteBudgetLineAction(ID);
    expect(calls[0].ops.filter(([op]) => op === "eq")).toEqual([["eq", ["id", ID]], ...owner]);
  });
});

describe("checklist", () => {
  it("adds an own item with the session user", async () => {
    const calls = setup();
    expect(await addChecklistItemAction("  Stage vinden ")).toMatchObject({ ok: true });
    expect(args(calls[0], "insert")).toEqual([{ user_id: "user-1", title: "Stage vinden", source: "user" }]);
    expect((await addChecklistItemAction("   ")).ok).toBe(false);
    expect((await addChecklistItemAction("a".repeat(201))).ok).toBe(false);
  });

  it("stores a closed rule item once per key, so the same key does not come back", async () => {
    const calls = setup();
    expect(await closeRuleItemAction("goal_unreachable:" + ID, "dismissed")).toMatchObject({ ok: true });
    const [rows, options] = args(calls[0], "upsert")!;
    expect(rows).toMatchObject({ user_id: "user-1", rule_key: "goal_unreachable:" + ID, source: "rule" });
    expect((rows as { dismissed_at: string }).dismissed_at).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(rows).not.toHaveProperty("done_at");
    expect(options).toEqual({ onConflict: "user_id,rule_key" });
    await closeRuleItemAction("ziekenfonds", "done");
    expect(args(calls[1], "upsert")![0]).toHaveProperty("done_at");
  });

  it("rejects a rule key of the wrong shape or an unknown way to close", async () => {
    const calls = setup();
    for (const [key, how] of [["", "done"], ["a".repeat(81), "done"], ["Rm -rf", "done"], ["ziekenfonds", "later"]]) {
      expect((await closeRuleItemAction(key, how as "done")).ok).toBe(false);
    }
    expect(calls).toHaveLength(0);
  });

  it("toggles done_at on and off for the own item", async () => {
    const calls = setup((call) => (has(call, "select") ? { data: { done_at: null } } : {}));
    expect(await toggleChecklistItemAction(ID)).toMatchObject({ ok: true });
    expect((args(calls[1], "update")![0] as { done_at: string }).done_at).toMatch(/^\d{4}-/);
    expect(calls[1].ops).toContainEqual(["eq", ["user_id", "user-1"]]);

    const again = setup((call) => (has(call, "select") ? { data: { done_at: "2026-10-01T00:00:00Z" } } : {}));
    await toggleChecklistItemAction(ID);
    expect(args(again[1], "update")).toEqual([{ done_at: null }]);
  });

  it("does not toggle an item that is not there", async () => {
    const calls = setup(() => ({ data: null }));
    expect((await toggleChecklistItemAction(ID)).ok).toBe(false);
    expect(calls).toHaveLength(1);
  });
});
