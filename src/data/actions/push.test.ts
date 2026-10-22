import { beforeEach, describe, expect, it, vi } from "vitest";
import { pushSubscriptionSchema } from "@/data/schemas";
import { args, fakeDb, has, type Call } from "@/data/test-helpers";

const m = vi.hoisted(() => ({ user: undefined as unknown, admin: undefined as unknown }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/data/supabase/server", () => ({
  requireUserId: async () => "user-1",
  createServerSupabase: async () => m.user,
}));
vi.mock("@/data/supabase/admin", () => ({ createAdminSupabase: () => m.admin }));

import { removePushSubscriptionAction, savePushSubscriptionAction } from "./push";

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc";
const SUB = { endpoint: ENDPOINT, keys: { p256dh: "p256dh-key", auth: "auth-key" } };
const WRONG = { ok: false, error: "Er ging iets mis. Probeer het opnieuw." };

describe("pushSubscriptionSchema", () => {
  it.each([
    ENDPOINT,
    "https://web.push.apple.com/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://db5p.notify.windows.com/?token=abc",
  ])("accepts %s", (endpoint) =>
    expect(pushSubscriptionSchema.safeParse({ ...SUB, endpoint }).success).toBe(true));

  it.each([
    "http://fcm.googleapis.com/x",
    "https://evil.example/x",
    "https://fcm.googleapis.com.evil.example/x",
    "https://evil.example/https://fcm.googleapis.com/x",
    "https://fcm.googleapis.com",
    `https://fcm.googleapis.com/${"a".repeat(1000)}`,
  ])("rejects %s", (endpoint) => expect(pushSubscriptionSchema.safeParse({ ...SUB, endpoint }).success).toBe(false));

  it.each([{}, { p256dh: "", auth: "a" }, { p256dh: "a", auth: "" }, { p256dh: "a" }])("rejects keys %j", (keys) =>
    expect(pushSubscriptionSchema.safeParse({ endpoint: ENDPOINT, keys }).success).toBe(false));

  it("rejects a subscription without keys", () =>
    expect(pushSubscriptionSchema.safeParse({ endpoint: ENDPOINT }).success).toBe(false));
});

type Failure = { code?: string; message?: string };
const op = (call: Call) => ["insert", "delete"].find((o) => has(call, o));

// One shared list shows the order in which the two clients wrote.
function setup({ deleteError = null, insertError = null }: { deleteError?: Failure | null; insertError?: Failure | null } = {}) {
  const order: string[] = [];
  const admin = fakeDb((call) => {
    order.push(`admin ${op(call)}`);
    return { error: deleteError };
  });
  const user = fakeDb((call) => {
    order.push(`user ${op(call)}`);
    return { error: has(call, "insert") ? insertError : null };
  });
  m.admin = admin.client;
  m.user = user.client;
  return { order, admin: admin.calls, user: user.calls };
}

beforeEach(() => vi.resetAllMocks());

describe("savePushSubscriptionAction", () => {
  it("deletes any row with that endpoint with the admin client, then inserts the own row with the user client", async () => {
    const { order, admin, user } = setup();
    expect(await savePushSubscriptionAction(SUB)).toEqual({ ok: true, data: undefined });
    expect(order).toEqual(["admin delete", "user insert"]);
    expect(admin[0].table).toBe("push_subscriptions");
    expect(admin[0].ops.filter(([o]) => o === "eq")).toEqual([["eq", ["endpoint", ENDPOINT]]]);
    expect(user[0].table).toBe("push_subscriptions");
    expect(args(user[0], "insert")).toEqual([{ user_id: "user-1", endpoint: ENDPOINT, p256dh: "p256dh-key", auth: "auth-key" }]);
    expect(has(user[0], "upsert")).toBe(false);
  });

  it("refuses an endpoint outside the allow-list without touching the database", async () => {
    const { order } = setup();
    expect((await savePushSubscriptionAction({ ...SUB, endpoint: "https://evil.example/x" })).ok).toBe(false);
    expect(await savePushSubscriptionAction({ endpoint: ENDPOINT })).toMatchObject({ ok: false });
    expect(order).toEqual([]);
  });

  it("does not insert when the delete fails", async () => {
    const { order } = setup({ deleteError: { code: "XX000", message: "boom" } });
    expect(await savePushSubscriptionAction(SUB)).toEqual(WRONG);
    expect(order).toEqual(["admin delete"]);
  });

  it("says the maximum of 10 devices is reached (row cap trigger)", async () => {
    setup({ insertError: { code: "23514", message: "row limit reached for push_subscriptions" } });
    expect(await savePushSubscriptionAction(SUB)).toEqual({
      ok: false,
      error: "Je kan meldingen op hoogstens 10 toestellen aanzetten.",
    });
  });

  it("gives the generic message for any other insert failure, including another CHECK", async () => {
    setup({ insertError: { code: "23514", message: 'new row violates check constraint "push_subscriptions_endpoint_check"' } });
    expect(await savePushSubscriptionAction(SUB)).toEqual(WRONG);
  });
});

describe("removePushSubscriptionAction", () => {
  it("deletes only the own row for that endpoint, with the user client", async () => {
    const { order, user } = setup();
    expect(await removePushSubscriptionAction(ENDPOINT)).toEqual({ ok: true, data: undefined });
    expect(order).toEqual(["user delete"]);
    expect(user[0].ops.filter(([o]) => o === "eq")).toEqual([["eq", ["endpoint", ENDPOINT]], ["eq", ["user_id", "user-1"]]]);
  });

  it("refuses anything but a string", async () => {
    const { order } = setup();
    expect((await removePushSubscriptionAction(42 as unknown as string)).ok).toBe(false);
    expect(order).toEqual([]);
  });

  it("reports a failed delete", async () => {
    m.user = fakeDb(() => ({ error: { code: "XX000", message: "boom" } })).client;
    expect(await removePushSubscriptionAction(ENDPOINT)).toEqual(WRONG);
  });
});
