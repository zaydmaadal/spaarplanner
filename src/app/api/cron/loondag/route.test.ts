import { beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "s".repeat(32);
const m = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/env", () => ({ serverEnv: () => ({ cronSecret: SECRET }) }));
vi.mock("@/lib/push", () => ({ sendPush: vi.fn() }));
vi.mock("@/data/supabase/admin", () => ({ createAdminSupabase: () => ({}) }));
vi.mock("@/data/cron/payday", () => ({ runPaydayCron: m.run }));

import { GET } from "./route";

const call = (authorization?: string) =>
  GET(new Request("http://localhost/api/cron/loondag", { headers: authorization ? { authorization } : {} }));

beforeEach(() => m.run.mockReset().mockResolvedValue({ users: 2, claimed: 1, sent: 1, removed: 0 }));

describe("GET /api/cron/loondag", () => {
  it.each([undefined, "", SECRET, "Bearer wrong", `Bearer ${SECRET}x`, `Bearer ${SECRET.slice(1)}`, `bearer ${SECRET}`])(
    "answers 401 for %j and runs nothing",
    async (header) => {
      expect((await call(header)).status).toBe(401);
      expect(m.run).not.toHaveBeenCalled();
    },
  );

  it("answers 200 with the counts for the right bearer", async () => {
    const res = await call(`Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ users: 2, claimed: 1, sent: 1, removed: 0 });
    expect(m.run).toHaveBeenCalledWith(expect.any(Date), expect.objectContaining({ send: expect.any(Function) }));
  });
});
