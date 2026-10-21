import { beforeEach, describe, expect, it, vi } from "vitest";
import { args, fakeDb, type Call } from "@/data/test-helpers";

const m = vi.hoisted(() => ({ claims: null as { sub: string } | null, db: undefined as unknown }));
vi.mock("@/data/supabase/server", () => ({
  createServerSupabase: async () => ({ auth: { getClaims: async () => ({ data: m.claims && { claims: m.claims } }) }, from: (m.db as { from: never }).from }),
}));

import { GET } from "./route";

const TABLES = ["profiles", "plans", "income_sources", "budget_lines", "goals", "transactions", "checklist_items", "push_subscriptions"];
const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `t${i}` }));

function setup(handler: (call: Call) => { data?: unknown; error?: { message: string } } | void = () => ({ data: [] })) {
  const db = fakeDb(handler);
  m.db = db.client;
  return db.calls;
}

beforeEach(() => {
  m.claims = { sub: "user-1" };
});

describe("GET /api/export", () => {
  it("answers 401 JSON without a session and reads nothing", async () => {
    m.claims = null;
    const calls = setup();
    const res = await GET();
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ error: "Niet ingelogd." });
    expect(calls).toHaveLength(0);
  });

  it("sends one download of JSON that is never cached", async () => {
    setup();
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="spaarplanner-export.json"');
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("holds the rows of exactly the 8 tables of the spec and nothing else", async () => {
    const calls = setup((call) => ({ data: [{ table: call.table }] }));
    const body = await (await GET()).json();
    expect(Object.keys(body).sort()).toEqual([...TABLES, "exported_at"].sort());
    for (const t of TABLES) expect(body[t]).toEqual([{ table: t }]);
    expect(calls.map((c) => c.table).sort()).toEqual([...TABLES].sort());
  });

  it("scopes by row level security only: no filter on a user id taken from the request", async () => {
    const calls = setup();
    await GET();
    for (const c of calls) expect(c.ops.some(([op]) => op === "eq")).toBe(false);
  });

  it("leaves the keys of the push subscriptions out", async () => {
    const calls = setup();
    await GET();
    const select = args(calls.find((c) => c.table === "push_subscriptions")!, "select")![0] as string;
    expect(select.split(",").map((c) => c.trim())).toEqual(["id", "user_agent", "created_at", "last_success_at", "failure_count"]);
  });

  it("reads all transactions, not just the first 1000 rows of the API", async () => {
    const calls = setup((call) => {
      if (call.table !== "transactions") return { data: [] };
      const [from] = args(call, "range") as [number, number];
      return { data: from === 0 ? rows(1000) : rows(3) };
    });
    const body = await (await GET()).json();
    expect(body.transactions).toHaveLength(1003);
    const ranges = calls.filter((c) => c.table === "transactions").map((c) => args(c, "range"));
    expect(ranges).toEqual([[0, 999], [1000, 1999]]);
  });

  it("sends nothing half-finished when a read fails: it throws, so Next answers 500", async () => {
    setup((call) => (call.table === "goals" ? { error: { message: "secret detail" } } : { data: [] }));
    await expect(GET()).rejects.toBeTruthy();
  });
});
