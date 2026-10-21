import { monthlyBudget, savingsTarget } from "@/domain/budget";
import { buildDashboard, type UserData } from "@/domain/dashboard";
import type { Cents, ISODate, YearMonth } from "@/domain/types";

export type SimInput = {
  savingsCents: Cents | null; // null: the slider was not moved, so start from the plan
  extraIncomeCents: Cents;
  extraExpensesCents: Cents;
  incomeMode: "careful" | "normal";
};

// Spec 5.5: the projection of 5.4 with the sliders applied. Only a picked amount stays as it is; the extras shift the
// amount the plan gives. The overview's own dashboard does the projecting, so with untouched sliders both agree.
export function simulate(base: UserData, today: ISODate, input: SimInput): { savingsCents: Cents; fills: Record<string, YearMonth | "full" | null> } {
  const budget = monthlyBudget(base.incomes, base.lines, input.incomeMode);
  const plan = { ...base.plan, incomeMode: input.incomeMode };
  const savingsCents =
    input.savingsCents ?? Math.max(0, savingsTarget(plan, budget, base.lines.length > 0).cents + input.extraIncomeCents - input.extraExpensesCents);
  const { goals } = buildDashboard({ ...base, plan: { ...plan, monthlySavingsCents: savingsCents } }, today);
  return { savingsCents, fills: Object.fromEntries(goals.map((g) => [g.id, g.fill])) };
}
