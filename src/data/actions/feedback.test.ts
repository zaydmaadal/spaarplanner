import { beforeEach, describe, expect, it, vi } from "vitest";
import { args, fakeDb, has, type Call } from "@/data/test-helpers";

const m = vi.hoisted(() => ({ db: undefined as unknown, admin: undefined as unknown, requireAdmin: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/data/supabase/server", () => ({
  requireUserId: async () => "user-1",
  requireAdmin: m.requireAdmin,
  createServerSupabase: async () => m.db,
}));
vi.mock("@/data/supabase/admin", () => ({ createAdminSupabase: () => m.admin }));

import { setFeedbackHandledAction } from "./admin";
import { sendFeedbackAction } from "./feedback";

const ID = "3f2b1c9e-7d4a-4e8b-9c1d-2a6f5e0b8d71";
const setup = (error: { code?: string; message?: string } | null = null) => {
  const db = fakeDb(() => ({ error }));
  m.db = db.client;
  m.admin = db.client;
  return db.calls;
};

beforeEach(() => {
  vi.resetAllMocks();
  m.requireAdmin.mockResolvedValue("admin-1");
});

describe("sendFeedbackAction", () => {
  it("inserts the trimmed message for the session user, whatever user the client names", async () => {
    const calls = setup();
    expect(await sendFeedbackAction({ kind: "bug", message: "  Storten lukt niet ", page: " Storten ", user_id: "someone-else" } as never)).toEqual({ ok: true, data: undefined });
    expect(args(calls[0], "insert")).toEqual([{ user_id: "user-1", kind: "bug", message: "Storten lukt niet", page: "Storten" }]);
  });

  it("stores no page when the field is left empty", async () => {
    const calls = setup();
    await sendFeedbackAction({ kind: "feedback", message: "Mooi", page: "  " });
    expect(args(calls[0], "insert")).toEqual([{ user_id: "user-1", kind: "feedback", message: "Mooi", page: null }]);
  });

  it("asks for a message and refuses an unknown kind, without a write", async () => {
    const calls = setup();
    expect(await sendFeedbackAction({ kind: "feedback", message: "   " })).toMatchObject({ ok: false, fieldErrors: { message: "Schrijf eerst je bericht." } });
    expect((await sendFeedbackAction({ kind: "idee", message: "x" } as never)).ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("answers with the generic error when the insert fails", async () => {
    setup({ message: "boom" });
    expect(await sendFeedbackAction({ kind: "bug", message: "x" })).toEqual({ ok: false, error: "Er ging iets mis. Probeer het opnieuw." });
  });
});

describe("setFeedbackHandledAction", () => {
  const write = (calls: Call[]) => calls.find((c) => has(c, "update"))!;

  it("stops when requireAdmin throws (the 404 for a non-admin) and touches nothing", async () => {
    const calls = setup();
    m.requireAdmin.mockRejectedValue(new Error("NEXT_NOT_FOUND"));
    await expect(setFeedbackHandledAction({ id: ID, handled: true })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(calls).toHaveLength(0);
  });

  it("stamps handled_at, or clears it to open the row again", async () => {
    const calls = setup();
    expect(await setFeedbackHandledAction({ id: ID, handled: true })).toEqual({ ok: true, data: undefined });
    expect(args(write(calls), "update")).toEqual([{ handled_at: expect.stringMatching(/^\d{4}-\d\d-\d\dT/) }]);
    expect(write(calls).ops).toContainEqual(["eq", ["id", ID]]);
    expect(m.revalidatePath).toHaveBeenCalledWith("/beheer");

    const again = setup();
    await setFeedbackHandledAction({ id: ID, handled: false });
    expect(args(write(again), "update")).toEqual([{ handled_at: null }]);
  });

  it("rejects an id that is not a uuid and reports a failed update", async () => {
    const calls = setup();
    expect((await setFeedbackHandledAction({ id: "x", handled: true })).ok).toBe(false);
    expect(calls).toHaveLength(0);
    setup({ message: "boom" });
    expect((await setFeedbackHandledAction({ id: ID, handled: true })).ok).toBe(false);
  });
});
