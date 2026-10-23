import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  sub: undefined as string | undefined,
  prefs: undefined as unknown,
  select: vi.fn(),
  connection: vi.fn(),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getClaims: async () => ({ data: m.sub ? { claims: { sub: m.sub } } : null }) },
    from: () => ({ select: m.select.mockReturnValue({ eq: () => ({ single: async () => ({ data: m.prefs && { prefs: m.prefs } }) }) }) }),
  }),
}));
vi.mock("next/server", () => ({ connection: m.connection }));
vi.mock("next/navigation", () => ({ notFound: m.notFound, redirect: m.redirect }));

import { readPrefs, requireAdmin, requireClaims } from "./server";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "pk");
  vi.stubEnv("NEXT_PUBLIC_AUTH_EMAIL_DOMAIN", "u.zaydmaadal.site");
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "vk");
  vi.stubEnv("ADMIN_USER_IDS", "admin-1, admin-2");
  // The real notFound() and redirect() throw, which stops the caller; the mocks must too.
  m.notFound.mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  });
  m.redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("requireAdmin", () => {
  it("returns the id of a listed admin", async () => {
    m.sub = "admin-2";
    expect(await requireAdmin()).toBe("admin-2");
    expect(m.notFound).not.toHaveBeenCalled();
  });

  it("answers 404 for a signed-in user who is not an admin", async () => {
    m.sub = "user-1";
    await expect(requireAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("answers 404 for everyone when ADMIN_USER_IDS is empty", async () => {
    vi.stubEnv("ADMIN_USER_IDS", "");
    m.sub = "user-1";
    await expect(requireAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("sends a visitor without a session to the login page", async () => {
    m.sub = undefined;
    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT");
    expect(m.redirect).toHaveBeenCalledWith("/inloggen");
  });
});

describe("createServerSupabase", () => {
  it("waits for the request-time stage first: the auth client reads Date.now, which Next flags in earlier stages", async () => {
    m.sub = "user-1";
    await requireClaims();
    expect(m.connection).toHaveBeenCalledOnce();
  });
});

describe("readPrefs", () => {
  it("returns the defaults without a session and does not redirect or query", async () => {
    m.sub = undefined;
    expect(await readPrefs()).toEqual({ palette: "zonsopgang", theme: "system" });
    expect(m.redirect).not.toHaveBeenCalled();
    expect(m.select).not.toHaveBeenCalled();
  });

  it("returns the stored palette and theme of the signed-in user", async () => {
    m.sub = "user-1";
    m.prefs = { palette: "smaragd", theme: "dark" };
    expect(await readPrefs()).toEqual({ palette: "smaragd", theme: "dark" });
  });

  it("falls back to the defaults for invalid values or a missing profile", async () => {
    m.sub = "user-1";
    m.prefs = { palette: "neon", theme: 3 };
    expect(await readPrefs()).toEqual({ palette: "zonsopgang", theme: "system" });
    m.prefs = undefined;
    expect(await readPrefs()).toEqual({ palette: "zonsopgang", theme: "system" });
  });
});
