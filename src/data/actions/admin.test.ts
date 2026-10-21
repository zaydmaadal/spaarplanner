import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userId: "admin-1",
  notFound: vi.fn(),
  createAdmin: vi.fn(),
  lookup: vi.fn(),
  updateUserById: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/data/supabase/admin", () => ({ createAdminSupabase: m.createAdmin }));
vi.mock("@/data/supabase/server", () => ({ requireUserId: async () => m.userId }));
vi.mock("@/lib/env", () => ({ serverEnv: () => ({ adminUserIds: ["admin-1"] }) }));
vi.mock("next/navigation", () => ({ notFound: m.notFound }));

import { requireAdmin, resetPasswordAction } from "./admin";

const GENERIC = { ok: false, error: "Er ging iets mis. Probeer het opnieuw." };

beforeEach(() => {
  m.userId = "admin-1";
  // The real notFound() throws, which stops the action; the mock must too.
  m.notFound.mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  });
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

describe("requireAdmin", () => {
  it("returns the id of an admin and hides the page from everyone else", async () => {
    expect(await requireAdmin()).toBe("admin-1");
    m.userId = "user-1";
    await expect(requireAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(m.notFound).toHaveBeenCalledTimes(1);
  });
});

describe("resetPasswordAction", () => {
  it("gives a non-admin a 404 and touches nothing", async () => {
    m.userId = "user-1";
    await expect(resetPasswordAction({ username: "haider" })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(m.notFound).toHaveBeenCalled();
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

  it("sets a random 16 character password, forces a change and writes one audit row", async () => {
    const result = await resetPasswordAction({ username: " Haider " });
    if (!result.ok) throw new Error(result.error);
    const { tempPassword } = result.data;
    expect(tempPassword).toMatch(/^[A-Za-z0-9_-]{16}$/);
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
