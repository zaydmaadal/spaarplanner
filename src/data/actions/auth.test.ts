import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  createAdmin: vi.fn(),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  updateUserById: vi.fn(),
  recentProfiles: vi.fn(),
  updateUser: vi.fn(),
  refreshSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/data/supabase/admin", () => ({ createAdminSupabase: m.createAdmin }));
vi.mock("@/data/supabase/server", () => ({
  createServerSupabase: async () => ({
    auth: { updateUser: m.updateUser, refreshSession: m.refreshSession, signOut: m.signOut },
  }),
  requireUserId: async () => "user-1",
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { changePasswordAction, logoutAction, registerAction } from "./auth";

const input = { username: "Haider", password: "een-lang-wachtwoord" };

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "pk");
  vi.stubEnv("NEXT_PUBLIC_AUTH_EMAIL_DOMAIN", "u.zaydmaadal.site");
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "vk");
  vi.stubEnv("SIGNUP_MODE", "open");
  m.createAdmin.mockReturnValue({
    auth: { admin: { createUser: m.createUser, deleteUser: m.deleteUser, updateUserById: m.updateUserById } },
    from: () => ({ select: () => ({ gte: m.recentProfiles }) }),
  });
  m.recentProfiles.mockResolvedValue({ count: 0, error: null });
  m.createUser.mockResolvedValue({ data: { user: { id: "new-id" } }, error: null });
  m.deleteUser.mockResolvedValue({ error: null });
  m.updateUser.mockResolvedValue({ error: null });
  m.updateUserById.mockResolvedValue({ error: null });
  m.refreshSession.mockResolvedValue({ error: null });
  m.signOut.mockResolvedValue({ error: null });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks(); // also drops unused mockResolvedValueOnce values
});

// Nothing past the gates ran: no admin client, no count, no user created.
function expectUntouched() {
  expect(m.createAdmin).not.toHaveBeenCalled();
  expect(m.recentProfiles).not.toHaveBeenCalled();
  expect(m.createUser).not.toHaveBeenCalled();
}

describe("registerAction", () => {
  it("is blocked when signup is closed", async () => {
    vi.stubEnv("SIGNUP_MODE", "closed");
    expect(await registerAction(input)).toEqual({ ok: false, error: "Registreren is nu gesloten." });
    expectUntouched();
  });

  it("checks the invite code in invite mode", async () => {
    vi.stubEnv("SIGNUP_MODE", "invite");
    vi.stubEnv("INVITE_CODE", "geheim");
    const wrong = { ok: false, error: "Deze uitnodigingscode klopt niet." };
    expect(await registerAction({ ...input, inviteCode: "fout" })).toEqual(wrong);
    expectUntouched();
    // A client can send anything; a non-string must be a wrong code, not a crash.
    expect(await registerAction({ ...input, inviteCode: 123 as unknown as string })).toEqual(wrong);
    expect(await registerAction(input)).toEqual(wrong);
    expectUntouched();
    expect(await registerAction({ ...input, inviteCode: "geheim" })).toEqual({ ok: true, data: undefined });
  });

  it("stops at 5 new accounts in the last hour", async () => {
    m.recentProfiles.mockResolvedValue({ count: 5, error: null });
    expect(await registerAction(input)).toEqual({
      ok: false,
      error: "Er zijn net veel accounts aangemaakt. Probeer het over een uur opnieuw.",
    });
    expect(m.createUser).not.toHaveBeenCalled();
  });

  it("removes the new user again when a parallel burst pushed the count over 5", async () => {
    m.recentProfiles.mockResolvedValueOnce({ count: 4, error: null }).mockResolvedValueOnce({ count: 6, error: null });
    expect(await registerAction(input)).toEqual({
      ok: false,
      error: "Er zijn net veel accounts aangemaakt. Probeer het over een uur opnieuw.",
    });
    expect(m.createUser).toHaveBeenCalledTimes(1);
    expect(m.deleteUser).toHaveBeenCalledWith("new-id");
  });

  it("keeps the new user at exactly 5 including itself", async () => {
    m.recentProfiles.mockResolvedValueOnce({ count: 4, error: null }).mockResolvedValueOnce({ count: 5, error: null });
    expect(await registerAction(input)).toEqual({ ok: true, data: undefined });
    expect(m.deleteUser).not.toHaveBeenCalled();
  });

  it("creates a confirmed user with the synthetic email", async () => {
    expect(await registerAction(input)).toEqual({ ok: true, data: undefined });
    expect(m.createUser).toHaveBeenCalledWith({
      email: "haider@u.zaydmaadal.site",
      password: input.password,
      email_confirm: true,
    });
  });

  it("reports a taken username next to the field", async () => {
    m.createUser.mockResolvedValue({ data: null, error: { code: "email_exists" } });
    const r = await registerAction(input);
    expect(r).toMatchObject({ ok: false, fieldErrors: { username: "Deze gebruikersnaam is al in gebruik." } });
  });

  it("returns field errors for invalid input without touching Supabase", async () => {
    const r = await registerAction({ username: "ab", password: "kort" });
    expect(r).toMatchObject({ ok: false, fieldErrors: { username: expect.any(String), password: expect.any(String) } });
    expectUntouched();
  });
});

describe("changePasswordAction", () => {
  it("updates the password, then clears the flag, then refreshes the session", async () => {
    expect(await changePasswordAction({ password: "een-nieuw-wachtwoord" })).toEqual({ ok: true, data: undefined });
    expect(m.updateUser).toHaveBeenCalledWith({ password: "een-nieuw-wachtwoord" });
    expect(m.updateUserById).toHaveBeenCalledWith("user-1", { app_metadata: { must_change_password: false } });
    const order = [m.updateUser, m.updateUserById, m.refreshSession].map((f) => f.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("returns the generic error when the session refresh fails", async () => {
    m.refreshSession.mockResolvedValue({ error: { message: "boom" } });
    expect(await changePasswordAction({ password: "een-nieuw-wachtwoord" })).toEqual({
      ok: false,
      error: "Er ging iets mis. Probeer het opnieuw.",
    });
  });

  it("rejects a short password before calling Supabase", async () => {
    const r = await changePasswordAction({ password: "kort" });
    expect(r).toMatchObject({ ok: false, fieldErrors: { password: expect.any(String) } });
    expect(m.updateUser).not.toHaveBeenCalled();
  });
});

describe("logoutAction", () => {
  it("signs out this device only", async () => {
    await logoutAction();
    expect(m.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
