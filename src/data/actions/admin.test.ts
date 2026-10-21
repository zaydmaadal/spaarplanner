import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createAdmin: vi.fn(),
  lookup: vi.fn(),
  updateUserById: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/data/supabase/admin", () => ({ createAdminSupabase: m.createAdmin }));
vi.mock("@/data/supabase/server", () => ({ requireAdmin: m.requireAdmin }));

import { resetPasswordAction } from "./admin";

const GENERIC = { ok: false, error: "Er ging iets mis. Probeer het opnieuw." };

beforeEach(() => {
  m.requireAdmin.mockResolvedValue("admin-1");
  m.createAdmin.mockReturnValue({
    auth: { admin: { updateUserById: m.updateUserById } },
    from: (table: string) =>
      table === "profiles"
        ? { select: () => ({ eq: (col: string, val: string) => ({ maybeSingle: () => m.lookup(col, val) }) }) }
        : { insert: m.insert },
  });
  m.lookup.mockResolvedValue({ data: { id: "target-id" }, error: null });
  m.updateUserById.mockResolvedValue({ error: null });
  m.insert.mockResolvedValue({ error: null });
});
afterEach(() => vi.resetAllMocks());

describe("resetPasswordAction", () => {
  it("stops when requireAdmin throws (the 404 for a non-admin) and touches nothing", async () => {
    // The real requireAdmin calls notFound(), which throws; see server.test.ts.
    m.requireAdmin.mockRejectedValue(new Error("NEXT_NOT_FOUND"));
    await expect(resetPasswordAction({ username: "haider" })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(m.createAdmin).not.toHaveBeenCalled();
    expect(m.updateUserById).not.toHaveBeenCalled();
  });

  it("says so for an unknown username and changes nothing", async () => {
    m.lookup.mockResolvedValue({ data: null, error: null });
    expect(await resetPasswordAction({ username: "nobody" })).toEqual({
      ok: false,
      error: "Geen gebruiker met die naam.",
    });
    expect(m.updateUserById).not.toHaveBeenCalled();
    expect(m.insert).not.toHaveBeenCalled();
  });

  it("answers a malformed username the same way, without a lookup", async () => {
    const unknown = { ok: false, error: "Geen gebruiker met die naam." };
    expect(await resetPasswordAction({ username: "??" })).toEqual(unknown);
    // A client can send anything.
    expect(await resetPasswordAction({ username: 42 as unknown as string })).toEqual(unknown);
    expect(m.lookup).not.toHaveBeenCalled();
  });

  it("sets a random 16 character password without look-alikes, forces a change and writes one audit row", async () => {
    const result = await resetPasswordAction({ username: " Haider " });
    if (!result.ok) throw new Error(result.error);
    const { tempPassword } = result.data;
    expect(tempPassword).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$/);
    expect(m.lookup).toHaveBeenCalledWith("username", "haider");
    expect(m.updateUserById).toHaveBeenCalledExactlyOnceWith("target-id", {
      password: tempPassword,
      app_metadata: { must_change_password: true },
    });
    expect(m.insert).toHaveBeenCalledExactlyOnceWith({
      admin_id: "admin-1",
      target_user_id: "target-id",
      action: "password_reset",
    });
    const second = await resetPasswordAction({ username: "haider" });
    expect(second.ok && second.data.tempPassword).not.toBe(tempPassword);
  });

  it("draws from all 32 symbols of the alphabet", async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const result = await resetPasswordAction({ username: "haider" });
      if (result.ok) [...result.data.tempPassword].forEach((c) => seen.add(c));
    }
    expect(seen.size).toBe(32);
  });

  it("fails without an audit row when the password cannot be set", async () => {
    m.updateUserById.mockResolvedValue({ error: { message: "boom" } });
    expect(await resetPasswordAction({ username: "haider" })).toEqual(GENERIC);
    expect(m.insert).not.toHaveBeenCalled();
  });

  it("does not reveal the password when the audit row cannot be written", async () => {
    m.insert.mockResolvedValue({ error: { message: "boom" } });
    expect(await resetPasswordAction({ username: "haider" })).toEqual(GENERIC);
  });

  it("fails when the lookup fails", async () => {
    m.lookup.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await resetPasswordAction({ username: "haider" })).toEqual(GENERIC);
    expect(m.updateUserById).not.toHaveBeenCalled();
  });
});
