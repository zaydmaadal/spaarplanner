import { beforeEach, describe, expect, it, vi } from "vitest";

// React.cache memoizes per request on the server and is a pass-through elsewhere (so also in other tests).
// Here it memoizes for the length of one test, to check that the three callers share one read.
const memos = vi.hoisted(() => [] as Map<string, unknown>[]);
vi.mock("react", () => ({
  cache: <A extends unknown[], R>(fn: (...a: A) => R) => {
    const memo = new Map<string, unknown>();
    memos.push(memo);
    return (...a: A): R => {
      const key = JSON.stringify(a);
      if (!memo.has(key)) memo.set(key, fn(...a));
      return memo.get(key) as R;
    };
  },
}));

const m = vi.hoisted(() => ({
  sub: undefined as string | undefined,
  getClaims: vi.fn(),
  select: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getClaims: m.getClaims.mockImplementation(async () => ({ data: m.sub ? { claims: { sub: m.sub } } : null })) },
    from: () => ({
      select: m.select.mockReturnValue({
        eq: () => ({ single: async () => ({ data: { id: "user-1", prefs: { palette: "smaragd" }, onboarding_completed_at: "2026-10-02T10:00:00Z" } }) }),
      }),
    }),
  }),
}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: m.redirect }));

import { readPrefs, readProfile, requireOnboarded, requireUserId } from "./server";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "pk");
  vi.stubEnv("NEXT_PUBLIC_AUTH_EMAIL_DOMAIN", "u.zaydmaadal.site");
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "vk");
  memos.forEach((memo) => memo.clear());
  m.getClaims.mockClear();
  m.select.mockClear();
  m.redirect.mockReset();
  m.redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
  m.sub = "user-1";
});

describe("one read per request", () => {
  it("does one getClaims and one profile select for the layout, the guard and the page together", async () => {
    const [prefs, userId, profile] = await Promise.all([
      readPrefs(),
      requireOnboarded(),
      requireUserId().then((id) => readProfile(id)), // what loadScreenData does
    ]);
    expect(prefs).toEqual({ palette: "smaragd", theme: "system" });
    expect(userId).toBe("user-1");
    expect(profile).toMatchObject({ id: "user-1" });
    expect(m.getClaims).toHaveBeenCalledTimes(1);
    expect(m.select).toHaveBeenCalledTimes(1);
  });

  it("keeps readPrefs from redirecting or querying without a session", async () => {
    m.sub = undefined;
    expect(await readPrefs()).toEqual({ palette: "zonsopgang", theme: "system" });
    expect(m.redirect).not.toHaveBeenCalled();
    expect(m.select).not.toHaveBeenCalled();
    await expect(requireOnboarded()).rejects.toThrow("NEXT_REDIRECT");
    expect(m.redirect).toHaveBeenCalledWith("/inloggen");
  });
});
