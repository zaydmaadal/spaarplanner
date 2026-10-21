import { beforeEach, describe, expect, it, vi } from "vitest";
import { args, fakeDb, has, type Call } from "@/data/test-helpers";

const m = vi.hoisted(() => ({ db: undefined as unknown, revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/data/supabase/server", () => ({
  requireUserId: async () => "user-1",
  createServerSupabase: async () => m.db,
}));

import { archiveGoalAction, reorderGoalsAction, saveGoalAction, setMainGoalAction, unarchiveGoalAction } from "./goals";

const ID = "3f2b1c9e-7d4a-4e8b-9c1d-2a6f5e0b8d71";
const ID_2 = "0b1c2d3e-4f50-4a61-8b72-93a4b5c6d7e8";

type Setup = { kind?: string; balance?: number; top?: number | null; write?: { data?: unknown; error?: { code?: string; message?: string } } };
function setup({ kind = "savings", balance = 0, top = null, write = {} }: Setup = {}) {
  const db = fakeDb((call: Call) => {
    if (call.table === "goal_balances") return { data: { balance_cents: balance } };
    if (call.table === "goals" && has(call, "order")) return { data: top === null ? null : { priority: top } };
    if (call.table === "goals" && has(call, "select") && !has(call, "insert")) return { data: { kind } };
    return write;
  });
  m.db = db.client;
  return db.calls;
}
const writes = (calls: Call[]) => calls.filter((c) => ["insert", "update", "delete"].some((op) => has(c, op)));

beforeEach(() => vi.resetAllMocks());

describe("archiveGoalAction", () => {
  it("refuses the emergency fund", async () => {
    const calls = setup({ kind: "emergency", balance: 0 });
    expect(await archiveGoalAction(ID)).toEqual({ ok: false, error: "Je noodfonds kan je niet archiveren." });
    expect(writes(calls)).toHaveLength(0);
  });

  it("refuses a pot that still holds money", async () => {
    const calls = setup({ balance: 100 });
    expect(await archiveGoalAction(ID)).toEqual({ ok: false, error: "Haal eerst het geld uit deze pot of verplaats het." });
    expect(writes(calls)).toHaveLength(0);
  });

  it("archives an empty pot and drops its main flag, only for the own row", async () => {
    const calls = setup();
    expect(await archiveGoalAction(ID)).toMatchObject({ ok: true });
    const [update] = writes(calls);
    expect(args(update, "update")).toEqual([{ status: "archived", is_main: false }]);
    expect(update.ops.filter(([op]) => op === "eq")).toEqual([["eq", ["id", ID]], ["eq", ["user_id", "user-1"]]]);
    expect(m.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("rejects an id that is not a uuid", async () => {
    const calls = setup();
    expect((await archiveGoalAction("1; drop table goals")).ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

describe("unarchiveGoalAction", () => {
  it("sets the status back to active for the own row", async () => {
    const calls = setup();
    expect(await unarchiveGoalAction(ID)).toMatchObject({ ok: true });
    expect(args(calls[0], "update")).toEqual([{ status: "active" }]);
    expect(calls[0].ops).toContainEqual(["eq", ["user_id", "user-1"]]);
  });
});

describe("saveGoalAction", () => {
  const goal = { name: " Laptop ", target: "1.000", kind: "purchase" as const, deadline: "2027-07", weight: 2 };

  it("inserts below the last priority with the session user and the deadline as the first of the month", async () => {
    const calls = setup({ top: 3, write: { data: { id: ID } } });
    expect(await saveGoalAction({ ...goal, user_id: "someone-else" } as typeof goal)).toEqual({ ok: true, data: { id: ID } });
    expect(args(calls.find((c) => has(c, "insert"))!, "insert")).toEqual([
      { user_id: "user-1", kind: "purchase", name: "Laptop", target_cents: 100000, target_is_estimate: false, deadline: "2027-07-01", weight: 2, priority: 4 },
    ]);
  });

  it("starts at priority 1 and stores no deadline when there is none", async () => {
    const calls = setup({ write: { data: { id: ID } } });
    await saveGoalAction({ name: "Reis", target: "1500" });
    expect(args(calls.find((c) => has(c, "insert"))!, "insert")![0]).toMatchObject({ priority: 1, deadline: null, kind: "other" });
  });

  it("updates an existing goal without touching its kind, priority or owner", async () => {
    const calls = setup();
    expect(await saveGoalAction({ ...goal, id: ID })).toEqual({ ok: true, data: { id: ID } });
    const update = calls.find((c) => has(c, "update"))!;
    expect(args(update, "update")).toEqual([
      { name: "Laptop", target_cents: 100000, target_is_estimate: false, deadline: "2027-07-01", weight: 2 },
    ]);
    expect(update.ops).toContainEqual(["eq", ["user_id", "user-1"]]);
  });

  it("says the maximum is reached at the row cap", async () => {
    setup({ write: { error: { code: "23514", message: "row limit reached for goals" } } });
    expect(await saveGoalAction(goal)).toEqual({ ok: false, error: "Je hebt het maximum bereikt. Verwijder eerst iets." });
  });

  it("returns field errors for a target of 0", async () => {
    const calls = setup();
    const result = await saveGoalAction({ ...goal, target: "0" });
    expect(result).toMatchObject({ ok: false, error: "Controleer je gegevens.", fieldErrors: { target: expect.any(String) } });
    expect(calls).toHaveLength(0);
  });
});

describe("setMainGoalAction", () => {
  it("clears the old main goal before setting the new one (one main goal per user)", async () => {
    const calls = setup();
    expect(await setMainGoalAction(ID)).toMatchObject({ ok: true });
    expect(calls.map((c) => args(c, "update"))).toEqual([[{ is_main: false }], [{ is_main: true }]]);
    expect(calls[1].ops).toContainEqual(["eq", ["id", ID]]);
    expect(calls[1].ops).toContainEqual(["eq", ["user_id", "user-1"]]);
  });
});

describe("reorderGoalsAction", () => {
  it("numbers the goals from 1 in the given order, own rows only", async () => {
    const calls = setup();
    expect(await reorderGoalsAction([ID_2, ID])).toMatchObject({ ok: true });
    expect(calls.map((c) => args(c, "update"))).toEqual([[{ priority: 1 }], [{ priority: 2 }]]);
    expect(calls[0].ops).toContainEqual(["eq", ["id", ID_2]]);
    expect(calls[1].ops).toContainEqual(["eq", ["user_id", "user-1"]]);
  });

  it("rejects an empty list and duplicate ids", async () => {
    const calls = setup();
    expect((await reorderGoalsAction([])).ok).toBe(false);
    expect((await reorderGoalsAction([ID, ID])).ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
});
