import { describe, expect, it } from "vitest";
import type { Tables } from "./database.types";
import { toBudgetLine, toGoal, toIncome, toPlan, toProfile } from "./mappers";

const goalRow: Tables<"goals"> = {
  id: "g1",
  user_id: "u1",
  kind: "trip",
  name: "Reis",
  target_cents: 150000,
  target_is_estimate: true,
  deadline: "2027-01-01",
  priority: 2,
  weight: 3,
  is_main: true,
  status: "active",
  color_token: null,
  created_at: "2026-10-01T10:00:00Z",
};

const profileRow: Tables<"profiles"> = {
  id: "u1",
  username: "haider",
  display_name: "Haider",
  locale: "nl-BE",
  currency: "EUR",
  timezone: "Europe/Brussels",
  onboarding_step: 8,
  onboarding_completed_at: "2026-10-02T10:00:00Z",
  prefs: { ziekenfonds: "nee", no_interest_savings: true, palette: "smaragd", context_note: "x" },
  created_at: "2026-10-01T10:00:00Z",
};

describe("toGoal", () => {
  it("turns the deadline date into a year and month and takes the balance from the view", () => {
    expect(toGoal(goalRow, 5000)).toEqual({
      id: "g1",
      kind: "trip",
      name: "Reis",
      targetCents: 150000,
      targetIsEstimate: true,
      balanceCents: 5000,
      deadline: { year: 2027, month: 1 },
      priority: 2,
      weight: 3,
      isMain: true,
      archived: false,
      createdAt: "2026-10-01T10:00:00Z",
    });
  });

  it("keeps a missing deadline null and flags an archived goal", () => {
    expect(toGoal({ ...goalRow, deadline: null, status: "archived" }, 0)).toMatchObject({ deadline: null, archived: true });
  });
});

describe("toProfile", () => {
  it("maps the snake_case prefs to camelCase and timezone to timeZone", () => {
    expect(toProfile(profileRow)).toEqual({
      displayName: "Haider",
      timeZone: "Europe/Brussels",
      prefs: { ziekenfonds: "nee", noInterestSavings: true },
    });
  });

  it("leaves a flag out when it is not a stored boolean, and has an empty name for a missing display name", () => {
    const p = toProfile({ ...profileRow, display_name: null, prefs: { ziekenfonds: "yes" } });
    expect(p.displayName).toBe("");
    expect(p.prefs).toEqual({});
  });
});

describe("toIncome, toBudgetLine, toPlan", () => {
  it("maps income columns", () => {
    const row: Tables<"income_sources"> = {
      id: "i1",
      user_id: "u1",
      name: "Salaris",
      kind: "salary",
      frequency: "monthly",
      amount_cents: 215000,
      amount_low_cents: 180000,
      variability: "variable",
      month: null,
      date: null,
      payday_rule: { type: "day_of_month", day: 29, weekend: "before" },
      is_estimate: true,
      active: true,
    };
    expect(toIncome(row)).toEqual({
      id: "i1",
      name: "Salaris",
      kind: "salary",
      frequency: "monthly",
      amountCents: 215000,
      amountLowCents: 180000,
      variability: "variable",
      month: null,
      date: null,
      paydayRule: { type: "day_of_month", day: 29, weekend: "before" },
      isEstimate: true,
      active: true,
    });
  });

  it("maps budget line columns", () => {
    const row: Tables<"budget_lines"> = {
      id: "b1",
      user_id: "u1",
      kind: "fixed",
      category: "Wonen",
      name: "Huur",
      amount_cents: 50000,
      is_estimate: false,
      sort: 0,
    };
    expect(toBudgetLine(row)).toEqual({ id: "b1", kind: "fixed", category: "Wonen", name: "Huur", amountCents: 50000, isEstimate: false });
  });

  it("maps plan columns and keeps a null savings amount (follows the room)", () => {
    const row: Tables<"plans"> = {
      user_id: "u1",
      monthly_savings_cents: null,
      emergency_share_pct: 50,
      income_mode: "normal",
      include_one_off_income: true,
      updated_at: "2026-10-01T10:00:00Z",
    };
    expect(toPlan(row)).toEqual({ monthlySavingsCents: null, emergencySharePct: 50, incomeMode: "normal", includeOneOffIncome: true });
  });
});
