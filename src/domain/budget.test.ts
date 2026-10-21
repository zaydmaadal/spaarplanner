import { describe, expect, test } from "vitest";
import { budgetWarnings, monthlyBudget, oneOffIncomes, savingsPerMonth, suggestedEmergencyTarget, suggestedSavings } from "./budget";
import { income, line, plan } from "./test-helpers";

const nov = { year: 2026, month: 11 };

describe("budget (spec 5.1)", () => {
  test("monthly budget, careful mode uses the low amount of variable income", () => {
    const variable = income({ amountCents: 120000, amountLowCents: 80000, variability: "variable" });
    const lines = [line("fixed", 70000)];
    expect(monthlyBudget([variable], lines, "careful")).toEqual({ incomeCents: 80000, expensesCents: 70000, roomCents: 10000 });
    expect(monthlyBudget([variable], lines, "normal").roomCents).toBe(50000); // §5.9 row 9
    expect(monthlyBudget([income({ amountCents: 10000, frequency: "weekly" })], [], "normal").incomeCents).toBe(43333);
    expect(monthlyBudget([income({ amountCents: 300000, frequency: "yearly", month: 12 })], [], "normal").incomeCents).toBe(0);
  });

  test("careful mode falls back to the normal amount when there is no low amount, and inactive income is left out", () => {
    const noLow = income({ amountCents: 120000, amountLowCents: null, variability: "variable" });
    const inactive = income({ amountCents: 50000, active: false });
    expect(monthlyBudget([noLow, inactive], [], "careful").incomeCents).toBe(120000);
  });

  test("savings per month follows the room when no target is set", () => {
    expect(savingsPerMonth(plan({ monthlySavingsCents: null }), -5000)).toBe(0);
    expect(savingsPerMonth(plan({ monthlySavingsCents: 60000 }), 50000)).toBe(60000);
  });

  test("suggestions", () => {
    expect(suggestedSavings(215000)).toBe(43000);
    expect(suggestedSavings(123456)).toBe(25000);
    expect(suggestedEmergencyTarget(165000)).toBe(495000);
    expect(suggestedEmergencyTarget(0)).toBe(100000);
  });

  test("warnings", () => {
    expect(budgetWarnings(plan({ monthlySavingsCents: null }), { incomeCents: 1, expensesCents: 2, roomCents: -1 })).toEqual([{ key: "negative_budget" }]);
    expect(budgetWarnings(plan({ monthlySavingsCents: 60000 }), { incomeCents: 0, expensesCents: 0, roomCents: 50000 })).toEqual([
      { key: "over_target", wantCents: 60000, roomCents: 50000 },
    ]);
  });

  test("one-off incomes: yearly every year in the horizon, once on its date, never before the current period", () => {
    expect(
      oneOffIncomes(
        [income({ amountCents: 200000, frequency: "yearly", month: 12 }), income({ amountCents: 5000, frequency: "once", date: "2026-08-01" })],
        "2026-11-01",
        nov,
        14,
      ),
    ).toEqual([
      { month: { year: 2026, month: 12 }, cents: 200000 },
      { month: { year: 2027, month: 12 }, cents: 200000 },
    ]);
  });
});
