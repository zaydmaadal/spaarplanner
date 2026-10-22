import { beforeEach, describe, expect, it, vi } from "vitest";
import { args, fakeDb } from "@/data/test-helpers";

const m = vi.hoisted(() => ({ db: undefined as unknown, revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/data/supabase/server", () => ({
  requireUserId: async () => "user-1",
  createServerSupabase: async () => m.db,
}));

import { savePlanAction } from "./plan";

function setup() {
  const db = fakeDb(() => {});
  m.db = db.client;
  return db.calls;
}
// Keys with value undefined are dropped by JSON.stringify, so they are not sent.
const sent = (call: ReturnType<typeof setup>[number]) => JSON.parse(JSON.stringify(args(call, "update")![0]));

beforeEach(() => vi.resetAllMocks());

describe("savePlanAction", () => {
  it("writes only what the user filled in: a left-out savings amount (the proposal) is never stored", async () => {
    const calls = setup();
    expect(await savePlanAction({ emergencySharePct: 50, incomeMode: "normal" })).toMatchObject({ ok: true });
    expect(sent(calls[0])).toEqual({ emergency_share_pct: 50, income_mode: "normal" });
    expect(calls[0].ops).toContainEqual(["eq", ["user_id", "user-1"]]);
    expect(m.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("stores a typed amount in cents, and null when the user chooses to follow the room", async () => {
    const calls = setup();
    await savePlanAction({ monthlySavings: "250" });
    expect(sent(calls[0])).toEqual({ monthly_savings_cents: 25000 });
    await savePlanAction({ monthlySavings: null, includeOneOffIncome: true });
    expect(sent(calls[1])).toEqual({ monthly_savings_cents: null, include_one_off_income: true });
  });

  it("rejects a share outside 0 to 100, an unknown mode and a negative or unreadable amount", async () => {
    const calls = setup();
    for (const bad of [{ emergencySharePct: 101 }, { emergencySharePct: 50.5 }, { incomeMode: "wild" }, { monthlySavings: "-5" }, { monthlySavings: "" }]) {
      expect((await savePlanAction(bad as never)).ok).toBe(false);
    }
    expect(calls).toHaveLength(0);
  });
});
