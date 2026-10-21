import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Fresh module per test: serverEnv() and publicEnv cache their first parse.
const load = async () => (await import("./env")) as typeof import("./env");

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllEnvs());

describe("signupConfig", () => {
  it("is closed when SIGNUP_MODE is unset", async () => {
    vi.stubEnv("SIGNUP_MODE", "");
    expect((await load()).signupConfig()).toEqual({ mode: "closed", inviteCode: null });
  });

  it("returns the invite code in invite mode", async () => {
    vi.stubEnv("SIGNUP_MODE", "invite");
    vi.stubEnv("INVITE_CODE", "abc");
    expect((await load()).signupConfig()).toEqual({ mode: "invite", inviteCode: "abc" });
  });

  it("throws for invite without INVITE_CODE", async () => {
    vi.stubEnv("SIGNUP_MODE", "invite");
    vi.stubEnv("INVITE_CODE", "");
    expect((await load()).signupConfig).toThrow(/INVITE_CODE/);
  });

  it("throws for an unknown mode", async () => {
    vi.stubEnv("SIGNUP_MODE", "maybe");
    expect((await load()).signupConfig).toThrow();
  });
});

describe("serverEnv", () => {
  const valid = {
    SUPABASE_SECRET_KEY: "sb_secret_x",
    VAPID_PRIVATE_KEY: "priv",
    VAPID_SUBJECT: "mailto:a@b.be",
    CRON_SECRET: "c".repeat(32),
    ADMIN_USER_IDS: "u1, u2",
  };
  const stub = (over: Record<string, string> = {}) =>
    Object.entries({ ...valid, ...over }).forEach(([k, v]) => vi.stubEnv(k, v));

  it("parses the values and the admin list", async () => {
    stub();
    expect((await load()).serverEnv()).toEqual({
      supabaseSecretKey: "sb_secret_x",
      vapidPrivateKey: "priv",
      vapidSubject: "mailto:a@b.be",
      cronSecret: "c".repeat(32),
      adminUserIds: ["u1", "u2"],
    });
  });

  it("treats an empty ADMIN_USER_IDS as no admins", async () => {
    stub({ ADMIN_USER_IDS: "" });
    expect((await load()).serverEnv().adminUserIds).toEqual([]);
  });

  it("throws when CRON_SECRET has 31 characters", async () => {
    stub({ CRON_SECRET: "c".repeat(31) });
    expect((await load()).serverEnv).toThrow(/CRON_SECRET/);
  });

  it("throws on first use, not on import, when a secret is missing", async () => {
    stub({ SUPABASE_SECRET_KEY: "" });
    const { serverEnv } = await load();
    expect(serverEnv).toThrow(/SUPABASE_SECRET_KEY/);
  });
});

describe("publicEnv", () => {
  it("does not throw on import or when untouched without env (CI build)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    await expect(load()).resolves.toBeDefined();
  });

  it("throws on access when a public variable is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const { publicEnv } = await load();
    expect(() => publicEnv.supabaseUrl).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("returns the values when all are set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    vi.stubEnv("NEXT_PUBLIC_AUTH_EMAIL_DOMAIN", "u.zaydmaadal.site");
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "pub");
    const { publicEnv } = await load();
    expect(publicEnv.supabaseUrl).toBe("http://127.0.0.1:54321");
    expect(publicEnv.authEmailDomain).toBe("u.zaydmaadal.site");
  });
});
