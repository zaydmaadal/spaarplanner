import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("web-push", () => ({ default: { sendNotification: m.send } }));
vi.mock("@/lib/env", () => ({
  publicEnv: { vapidPublicKey: "pub" },
  serverEnv: () => ({ vapidPrivateKey: "priv", vapidSubject: "mailto:a@b.be" }),
}));

import { sendPush } from "./push";

const SUB = { endpoint: "https://fcm.googleapis.com/x", p256dh: "p", auth: "a" };
const PAYLOAD = { title: "T", body: "B", url: "/storten" };

beforeEach(() => m.send.mockReset());

describe("sendPush", () => {
  it("sends the payload with VAPID, a TTL and a 10 s timeout", async () => {
    m.send.mockResolvedValue({ statusCode: 201 });
    expect(await sendPush(SUB, PAYLOAD)).toBe("ok");
    expect(m.send).toHaveBeenCalledWith(
      { endpoint: SUB.endpoint, keys: { p256dh: "p", auth: "a" } },
      JSON.stringify(PAYLOAD),
      { TTL: 43200, timeout: 10_000, vapidDetails: { subject: "mailto:a@b.be", publicKey: "pub", privateKey: "priv" } },
    );
  });

  it.each([[404, "gone"], [410, "gone"], [400, "error"], [429, "error"], [500, "error"], [undefined, "error"]])(
    "maps status %s to %s",
    async (statusCode, result) => {
      m.send.mockRejectedValueOnce(Object.assign(new Error("x"), { statusCode }));
      const r = await sendPush(SUB, PAYLOAD);
      expect(r).toBe(result);
    },
  );
});
