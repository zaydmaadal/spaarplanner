import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Tables } from "@/data/database.types";
import { fakeDb, type Call } from "@/data/test-helpers";

const m = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/data/supabase/server", () => ({
  requireUserId: async () => "user-1",
  createServerSupabase: async () => m.db,
  readProfile: async () => profile,
}));

import { loadUserData } from "./load";

const profile: Tables<"profiles"> = {
  id: "user-1",
  username: "haider",
  display_name: "Haider",
  locale: "nl-BE",
  currency: "EUR",
  timezone: "Europe/Brussels",
  onboarding_step: 8,
  onboarding_completed_at: "2026-10-02T10:00:00Z",
  prefs: { first_job: true },
  created_at: "2026-10-01T10:00:00Z",
};
const plan: Tables<"plans"> = {
  user_id: "user-1",
  monthly_savings_cents: null,
  emergency_share_pct: 100,
  income_mode: "careful",
  include_one_off_income: false,
  updated_at: "2026-10-01T10:00:00Z",
};
const income: Tables<"income_sources"> = {
  id: "i1",
  user_id: "user-1",
  name: "Salaris",
  kind: "salary",
  frequency: "monthly",
  amount_cents: 215000,
  amount_low_cents: null,
  variability: "fixed",
  month: null,
  date: null,
  payday_rule: { type: "day_of_month", day: 25, weekend: "before" },
  is_estimate: false,
  active: true,
};
const goal: Tables<"goals"> = {
  id: "g1",
  user_id: "user-1",
  kind: "trip",
  name: "Reis",
  target_cents: 150000,
  target_is_estimate: false,
  deadline: "2027-07-01",
  priority: 1,
  weight: 1,
  is_main: true,
  status: "active",
  color_token: null,
  created_at: "2026-10-01T10:00:00Z",
};
const tx = (goal_id: string, amount_cents: number, occurred_on: string, source = "manual") => ({ goal_id, amount_cents, occurred_on, source });

function setup(overrides: Record<string, object> = {}) {
  const rows: Record<string, object> = {
    plans: { data: plan },
    income_sources: { data: [income] },
    budget_lines: { data: [{ id: "b1", user_id: "user-1", kind: "fixed", category: "Wonen", name: "Huur", amount_cents: 50000, is_estimate: false, sort: 0 }] },
    goals: { data: [goal] },
    goal_balances: { data: [{ goal_id: "g1", balance_cents: 12345 }] },
    transactions: {
      data: [
        tx("g1", 10000, "2026-10-01"),
        tx("g1", -2000, "2026-10-10"),
        tx("g1", 50000, "2026-09-30", "start"), // start balance: not a deposit
        tx("g1", 5000, "2026-09-20"), // before this period
      ],
    },
    checklist_items: { data: [{ rule_key: "ziekenfonds" }] },
    ...overrides,
  };
  const db = fakeDb((call: Call) => rows[call.table]);
  m.db = db.client;
  return db.calls;
}

beforeEach(() => vi.resetAllMocks());

describe("loadUserData", () => {
  it("maps every table to the domain shape and books the deposits of the current period per goal", async () => {
    setup();
    const data = await loadUserData("2026-10-21"); // payday Fri 23 oct (25th is a Sunday), so the period is 25 sep to 22 oct
    expect(data.profile).toEqual({ displayName: "Haider", timeZone: "Europe/Brussels", prefs: { firstJob: true } });
    expect(data.plan).toEqual({ monthlySavingsCents: null, emergencySharePct: 100, incomeMode: "careful", includeOneOffIncome: false });
    expect(data.incomes).toHaveLength(1);
    expect(data.lines).toEqual([{ id: "b1", kind: "fixed", category: "Wonen", name: "Huur", amountCents: 50000, isEstimate: false }]);
    expect(data.goals).toEqual([expect.objectContaining({ id: "g1", balanceCents: 12345, deadline: { year: 2027, month: 7 }, isMain: true })]);
    expect(data.depositsThisPeriod).toEqual({ g1: 8000 });
    expect(data.closedRuleKeys).toEqual(["ziekenfonds"]);
  });

  it("fetches in one go and only asks for the transactions of the last 62 days", async () => {
    const calls = setup();
    await loadUserData("2026-10-21");
    expect(calls.map((c) => c.table).sort()).toEqual(["budget_lines", "checklist_items", "goal_balances", "goals", "income_sources", "plans", "transactions"]);
    const txCall = calls.find((c) => c.table === "transactions")!;
    expect(txCall.ops).toContainEqual(["gte", ["occurred_on", "2026-08-20"]]);
  });

  it("asks for the closed rule keys with the not-null and done-or-dismissed filters", async () => {
    const calls = setup();
    await loadUserData("2026-10-21");
    const ops = calls.find((c) => c.table === "checklist_items")!.ops;
    expect(ops).toContainEqual(["not", ["rule_key", "is", null]]);
    expect(ops).toContainEqual(["or", ["done_at.not.is.null,dismissed_at.not.is.null"]]);
  });

  it("counts a goal without a balance row as empty", async () => {
    setup({ goal_balances: { data: [] } });
    expect((await loadUserData("2026-10-21")).goals[0].balanceCents).toBe(0);
  });

  it("throws when a query fails, so the error boundary shows the retry card", async () => {
    setup({ plans: { error: { code: "XX000", message: "down" } } });
    await expect(loadUserData("2026-10-21")).rejects.toBeTruthy();
    setup({ goals: { error: { code: "XX000", message: "down" } } });
    await expect(loadUserData("2026-10-21")).rejects.toBeTruthy();
  });
});

