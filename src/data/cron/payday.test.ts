import { describe, expect, it, vi } from "vitest";
import type { sendPush } from "@/lib/push";
import { runPaydayCron, type CronDeps } from "./payday";

type Row = Record<string, unknown>;
type Tables = Record<"profiles" | "income_sources" | "push_subscriptions" | "notification_log", Row[]>;

// In-memory stand-in for the Supabase client: only the chains the cron uses, with the semantics it relies on
// (range slices, upsert with ignoreDuplicates returns only the rows it inserted).
function fakeDb(tables: Tables) {
  const from = (name: keyof Tables) => {
    const rows = tables[name];
    let op = "select";
    let patch: Row = {};
    let inserted: Row[] = [];
    let slice: [number, number] = [0, Infinity];
    const filters: Array<(r: Row) => boolean> = [];
    const q = {
      select: () => q,
      order: () => q,
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
      in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), q),
      range: (a: number, b: number) => ((slice = [a, b]), q),
      update: (p: Row) => ((op = "update"), (patch = p), q),
      delete: () => ((op = "delete"), q),
      upsert: (row: Row, opts: { onConflict: string }) => {
        op = "upsert";
        const keys = opts.onConflict.split(",");
        if (!rows.some((r) => keys.every((k) => r[k] === row[k]))) rows.push(...(inserted = [{ id: `log-${rows.length}`, ...row }]));
        return q;
      },
      then: (resolve: (v: unknown) => void) => {
        const hit = rows.filter((r) => filters.every((f) => f(r)));
        if (op === "update") hit.forEach((r) => Object.assign(r, patch));
        if (op === "delete") hit.forEach((r) => rows.splice(rows.indexOf(r), 1));
        resolve({ error: null, data: op === "upsert" ? inserted : op === "select" ? hit.slice(slice[0], slice[1] + 1) : null });
      },
    };
    return q;
  };
  return { from } as unknown as CronDeps["db"];
}

const DAY29 = { type: "day_of_month", day: 29, weekend: "before" };
const user = (id: string, rule: Row = DAY29, timezone = "Europe/Brussels") => [
  { profile: { id, timezone }, income: { id: `i-${id}`, user_id: id, name: "Loon", kind: "salary", frequency: "monthly", amount_cents: 250000, amount_low_cents: null, variability: "fixed", month: null, date: null, payday_rule: rule, is_estimate: false, active: true } },
];
const sub = (id: string, userId: string, failure_count = 0) => ({ id, user_id: userId, endpoint: `https://fcm.googleapis.com/${id}`, p256dh: "p", auth: "a", failure_count, last_success_at: null });

function setup(users: ReturnType<typeof user>, subs: Row[], result: Awaited<ReturnType<typeof sendPush>> = "ok") {
  const tables: Tables = { profiles: users.map((u) => u.profile), income_sources: users.map((u) => u.income), push_subscriptions: subs, notification_log: [] };
  const send = vi.fn<typeof sendPush>(async () => result);
  return { tables, send, run: (now: string) => runPaydayCron(new Date(now), { db: fakeDb(tables), send }) };
}

describe("runPaydayCron", () => {
  it("claims and sends once on the payday, never twice", async () => {
    const { run, send, tables } = setup(user("u1"), [sub("s1", "u1")]);
    expect(await run("2026-10-29T06:00:00Z")).toEqual({ users: 1, claimed: 1, sent: 1, removed: 0 });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ endpoint: "https://fcm.googleapis.com/s1" }), { title: "Loondag!", body: "Vul in wat je opzijzette.", url: "/storten" });
    expect(await run("2026-10-29T06:00:00Z")).toMatchObject({ claimed: 0, sent: 0 });
    expect(send).toHaveBeenCalledTimes(1);
    expect(tables.push_subscriptions[0]).toMatchObject({ failure_count: 0, last_success_at: "2026-10-29T06:00:00.000Z" });
  });

  it("catches up the day after, once", async () => {
    const { run, send, tables } = setup(user("u1"), [sub("s1", "u1")]);
    expect(await run("2026-10-30T06:00:00Z")).toMatchObject({ claimed: 1, sent: 1 });
    expect(tables.notification_log[0]).toMatchObject({ user_id: "u1", kind: "payday", for_date: "2026-10-29" });
    await run("2026-10-30T06:00:00Z");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("catches up across a month boundary", async () => {
    const { run, tables } = setup(user("u1", { type: "day_of_month", day: 30, weekend: "before" }), [sub("s1", "u1")]);
    expect(await run("2026-12-01T06:00:00Z")).toMatchObject({ claimed: 1, sent: 1 });
    expect(tables.notification_log[0]).toMatchObject({ for_date: "2026-11-30" });
  });

  it("does not send on other days or without a fixed payday", async () => {
    const { run, send } = setup([...user("u1"), ...user("u2", { type: "irregular" })], [sub("s1", "u1"), sub("s2", "u2")]);
    expect(await run("2026-10-28T06:00:00Z")).toEqual({ users: 2, claimed: 0, sent: 0, removed: 0 });
    expect(await run("2026-10-29T06:00:00Z")).toMatchObject({ claimed: 1 });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("uses the date in the time zone of the user", async () => {
    const day23 = { type: "day_of_month", day: 23, weekend: "before" };
    const { run, send } = setup(user("u1", day23), [sub("s1", "u1")]);
    expect(await run("2026-10-22T21:30:00Z")).toMatchObject({ claimed: 0 }); // local: 22 oktober 23:30
    expect(send).not.toHaveBeenCalled();
    expect(await run("2026-10-22T23:30:00Z")).toMatchObject({ claimed: 1, sent: 1 }); // local: 23 oktober 01:30
  });

  it("deletes a gone subscription", async () => {
    const { run, tables } = setup(user("u1"), [sub("s1", "u1")], "gone");
    expect(await run("2026-10-29T06:00:00Z")).toEqual({ users: 1, claimed: 1, sent: 0, removed: 1 });
    expect(tables.push_subscriptions).toEqual([]);
  });

  it("counts errors and deletes at the fifth", async () => {
    const { run, tables } = setup(user("u1"), [sub("s1", "u1", 3), sub("s2", "u1", 4)], "error");
    expect(await run("2026-10-29T06:00:00Z")).toMatchObject({ sent: 0, removed: 1 });
    expect(tables.push_subscriptions).toMatchObject([{ id: "s1", failure_count: 4 }]);
  });

  it("goes on after a bad time zone and after a user that throws", async () => {
    const { run, send } = setup([...user("u1", DAY29, "Bad/Zone"), ...user("u2"), ...user("u3")], [sub("s1", "u1"), sub("s2", "u2"), sub("s3", "u3")]);
    send.mockRejectedValueOnce(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await run("2026-10-29T06:00:00Z")).toEqual({ users: 3, claimed: 3, sent: 2, removed: 0 });
    expect(send).toHaveBeenCalledTimes(3);
  });
});
