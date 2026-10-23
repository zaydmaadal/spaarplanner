import { beforeEach, describe, expect, it, vi } from "vitest";
import { args, fakeDb, has, type Call } from "@/data/test-helpers";

const m = vi.hoisted(() => ({ db: undefined as unknown, revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/data/supabase/server", () => ({
  requireUserId: async () => "user-1",
  createServerSupabase: async () => m.db,
}));

import { saveProfileAction } from "./profile";

const stored = { palette: "zonsopgang", context_note: "Ik heb stage in maart", first_job: true, future_key: 1 };

function setup(error: { code?: string; message?: string } | null = null) {
  const db = fakeDb((call: Call) => (has(call, "select") ? { data: { prefs: stored } } : { error }));
  m.db = db.client;
  return db.calls;
}
const update = (calls: Call[]) => calls.find((c) => has(c, "update"))!;

beforeEach(() => vi.resetAllMocks());

describe("saveProfileAction", () => {
  it("merges the new prefs into the stored jsonb: context_note and other keys survive a palette change", async () => {
    const calls = setup();
    expect(await saveProfileAction({ prefs: { palette: "lagune", theme: "dark" } })).toEqual({ ok: true, data: undefined });
    expect(args(update(calls), "update")).toEqual([
      { prefs: { palette: "lagune", theme: "dark", context_note: "Ik heb stage in maart", first_job: true, future_key: 1 } },
    ]);
    expect(update(calls).ops).toContainEqual(["eq", ["id", "user-1"]]);
    expect(m.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("writes camelCase input to the snake_case keys", async () => {
    const calls = setup();
    await saveProfileAction({ prefs: { firstJob: false, noInterestSavings: true, showBasmala: true, contextNote: "nieuw" } });
    expect(args(update(calls), "update")![0]).toEqual({
      prefs: { ...stored, first_job: false, no_interest_savings: true, show_basmala: true, context_note: "nieuw" },
    });
  });

  it("keeps what step 6 of the onboarding asked as cents (null clears it), until the emergency fund exists", async () => {
    const calls = setup();
    await saveProfileAction({ prefs: { startBalance: "6.000", emergencyTarget: null } });
    expect(args(update(calls), "update")![0]).toEqual({ prefs: { ...stored, start_balance_cents: 600000, emergency_target_cents: null } });
    expect((await saveProfileAction({ prefs: { startBalance: "veel" } })).ok).toBe(false);
  });

  it("refuses a step 6 target of 0 on step 6 (the fund needs more than 0) but accepts a start balance of 0", async () => {
    const calls = setup();
    expect(await saveProfileAction({ prefs: { emergencyTarget: "0" } })).toMatchObject({ ok: false, fieldErrors: { emergencyTarget: "Vul een bedrag in dat groter is dan 0." } });
    expect(calls).toHaveLength(0);
    expect(await saveProfileAction({ prefs: { startBalance: "0", emergencyTarget: "1" } })).toMatchObject({ ok: true });
    expect(args(update(calls), "update")![0]).toEqual({ prefs: { ...stored, start_balance_cents: 0, emergency_target_cents: 100 } });
  });

  it("takes only whitelisted keys and values, so no extra key can reach the jsonb", async () => {
    const calls = setup();
    const bad = await saveProfileAction({ prefs: { palette: "neon" } } as never);
    expect(bad).toMatchObject({ ok: false, fieldErrors: { palette: expect.any(String) } });
    expect(calls).toHaveLength(0);
    await saveProfileAction({ prefs: { theme: "light", is_admin: true, "__proto__": { x: 1 } } } as never);
    expect(args(update(calls), "update")![0]).toEqual({ prefs: { ...stored, theme: "light" } });
  });

  it("refuses a context note over 2000 characters and accepts exactly 2000", async () => {
    const calls = setup();
    const long = await saveProfileAction({ prefs: { contextNote: "a".repeat(2001) } });
    expect(long).toMatchObject({ ok: false, fieldErrors: { contextNote: expect.stringContaining("2.000") } });
    expect(calls).toHaveLength(0);
    expect(await saveProfileAction({ prefs: { contextNote: "a".repeat(2000) } })).toMatchObject({ ok: true });
  });

  it("changes only the display name without reading or touching prefs, and stores an empty name as null", async () => {
    const calls = setup();
    await saveProfileAction({ displayName: "  Haider " });
    expect(calls).toHaveLength(1);
    expect(args(update(calls), "update")).toEqual([{ display_name: "Haider" }]);
    await saveProfileAction({ displayName: "  " });
    expect(args(calls[1], "update")).toEqual([{ display_name: null }]);
  });

  it("returns a Dutch error when the database refuses", async () => {
    setup({ code: "XX000", message: "boom" });
    expect(await saveProfileAction({ displayName: "Haider" })).toEqual({ ok: false, error: "Er ging iets mis. Probeer het opnieuw." });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});
