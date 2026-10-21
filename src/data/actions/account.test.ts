import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  claims: {} as { sub: string; email: string },
  createClient: vi.fn(),
  signIn: vi.fn(),
  createAdmin: vi.fn(),
  deleteUser: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/data/supabase/admin", () => ({ createAdminSupabase: m.createAdmin }));
vi.mock("@/data/supabase/server", () => ({
  createServerSupabase: async () => ({ auth: { signOut: m.signOut } }),
  requireClaims: async () => m.claims,
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: m.createClient }));

import { deleteAccountAction } from "./account";

const wrong = "Dit wachtwoord klopt niet.";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "pk");
  vi.stubEnv("NEXT_PUBLIC_AUTH_EMAIL_DOMAIN", "u.zaydmaadal.site");
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "vk");
  m.claims = { sub: "user-1", email: "haider@u.zaydmaadal.site" };
  m.createClient.mockReturnValue({ auth: { signInWithPassword: m.signIn } });
  m.signIn.mockResolvedValue({ error: null });
  m.createAdmin.mockReturnValue({ auth: { admin: { deleteUser: m.deleteUser } } });
  m.deleteUser.mockResolvedValue({ error: null });
  m.signOut.mockResolvedValue({ error: null });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("deleteAccountAction", () => {
  it("checks the password on a fresh client that stores nothing, then deletes the user, then signs out this device", async () => {
    expect(await deleteAccountAction({ password: "een-lang-wachtwoord" })).toEqual({ ok: true, data: undefined });
    expect(m.createClient).toHaveBeenCalledWith("http://127.0.0.1:54321", "pk", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    expect(m.signIn).toHaveBeenCalledWith({ email: "haider@u.zaydmaadal.site", password: "een-lang-wachtwoord" });
    expect(m.deleteUser).toHaveBeenCalledWith("user-1");
    expect(m.signOut).toHaveBeenCalledWith({ scope: "local" });
    const order = [m.signIn, m.deleteUser, m.signOut].map((f) => f.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("refuses a wrong password and deletes nothing", async () => {
    m.signIn.mockResolvedValue({ error: { code: "invalid_credentials" } });
    expect(await deleteAccountAction({ password: "fout" })).toEqual({
      ok: false,
      error: wrong,
      fieldErrors: { password: wrong },
    });
    expect(m.createAdmin).not.toHaveBeenCalled();
    expect(m.deleteUser).not.toHaveBeenCalled();
    expect(m.signOut).not.toHaveBeenCalled();
  });

  it.each([undefined, "", 123 as unknown as string])("refuses a missing password (%s) without asking Supabase", async (password) => {
    expect(await deleteAccountAction({ password })).toMatchObject({ ok: false, error: wrong });
    expect(m.signIn).not.toHaveBeenCalled();
    expect(m.deleteUser).not.toHaveBeenCalled();
  });

  it("does not call a rate limit or outage a wrong password, and deletes nothing", async () => {
    m.signIn.mockResolvedValue({ error: { code: "over_request_rate_limit" } });
    expect(await deleteAccountAction({ password: "een-lang-wachtwoord" })).toEqual({
      ok: false,
      error: "Er ging iets mis. Probeer het opnieuw.",
    });
    expect(m.deleteUser).not.toHaveBeenCalled();
  });

  it("keeps the session when the deletion fails, so the user can try again", async () => {
    m.deleteUser.mockResolvedValue({ error: { message: "boom" } });
    expect(await deleteAccountAction({ password: "een-lang-wachtwoord" })).toEqual({
      ok: false,
      error: "Er ging iets mis. Probeer het opnieuw.",
    });
    expect(m.signOut).not.toHaveBeenCalled();
  });

  it("deletes nothing when the admin client cannot be created (secret missing)", async () => {
    m.createAdmin.mockImplementation(() => {
      throw new Error("Invalid server environment");
    });
    await expect(deleteAccountAction({ password: "een-lang-wachtwoord" })).rejects.toThrow("Invalid server environment");
    expect(m.deleteUser).not.toHaveBeenCalled();
  });
});
