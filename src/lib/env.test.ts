import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Fresh module per test: serverEnv() and publicEnv cache their first parse.
const load = async () => (await import("./env")) as typeof import("./env");

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllEnvs());

describe("signupConfig", () => {
  it("is closed when SIGNUP_MODE is unset", async () => {
    vi.stubEnv("SIGNUP_MODE", "");
    expect((await load()).signupConfig()).toEqual({ mode: "closed", inviteCode: null, hourlyCap: 5 });
  });

  it("returns the invite code in invite mode", async () => {
    vi.stubEnv("SIGNUP_MODE", "invite");
    vi.stubEnv("INVITE_CODE", "abc");
    expect((await load()).signupConfig()).toEqual({ mode: "invite", inviteCode: "abc", hourlyCap: 5 });
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

  describe("hourlyCap", () => {
    it("is 5 when SIGNUP_HOURLY_CAP is unset or empty", async () => {
      vi.stubEnv("SIGNUP_HOURLY_CAP", undefined);
      const { signupConfig } = await load();
      expect(signupConfig().hourlyCap).toBe(5);
      vi.stubEnv("SIGNUP_HOURLY_CAP", "");
      expect(signupConfig().hourlyCap).toBe(5);
    });

    it("can be raised, for the e2e run", async () => {
      vi.stubEnv("SIGNUP_HOURLY_CAP", "1000");
      expect((await load()).signupConfig().hourlyCap).toBe(1000);
    });

    // Throwing, like an unknown SIGNUP_MODE: a typo must not silently disable or change the cap.
    it.each(["abc", "0", "-1", "1.5", "Infinity"])("throws for %s", async (value) => {
      vi.stubEnv("SIGNUP_HOURLY_CAP", value);
      expect((await load()).signupConfig).toThrow();
    });
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

describe("adminUserIds", () => {
  it("parses a comma list and works without the other secrets", async () => {
    vi.stubEnv("ADMIN_USER_IDS", "u1, u2,,");
    expect((await load()).adminUserIds()).toEqual(["u1", "u2"]);
  });

  it("is empty when unset or empty", async () => {
    const { adminUserIds } = await load();
    vi.stubEnv("ADMIN_USER_IDS", "");
    expect(adminUserIds()).toEqual([]);
    vi.stubEnv("ADMIN_USER_IDS", undefined);
    expect(adminUserIds()).toEqual([]);
  });
});

describe("publicEnv", () => {
  const stubAll = () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    vi.stubEnv("NEXT_PUBLIC_AUTH_EMAIL_DOMAIN", "u.zaydmaadal.site");
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "pub");
  };

  it("does not throw on import or when untouched without env (CI build)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const { publicEnv } = await load();
    expect(Object.keys(publicEnv)).toHaveLength(4);
  });

  it("throws on access when a public variable is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const { publicEnv } = await load();
    expect(() => publicEnv.supabaseUrl).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("returns the values when all are set, and lists its four keys", async () => {
    stubAll();
    const { publicEnv } = await load();
    expect(publicEnv.supabaseUrl).toBe("http://127.0.0.1:54321");
    expect(Object.keys(publicEnv)).toEqual([
      "supabaseUrl",
      "supabasePublishableKey",
      "authEmailDomain",
      "vapidPublicKey",
    ]);
    expect({ ...publicEnv }).toEqual({
      supabaseUrl: "http://127.0.0.1:54321",
      supabasePublishableKey: "sb_publishable_x",
      authEmailDomain: "u.zaydmaadal.site",
      vapidPublicKey: "pub",
    });
  });

  it("validatePublicEnv throws when a variable is missing and passes when all are set", async () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
    expect((await load()).validatePublicEnv).toThrow(/NEXT_PUBLIC_VAPID_PUBLIC_KEY/);
    vi.resetModules();
    stubAll();
    expect((await load()).validatePublicEnv).not.toThrow();
  });
});
