import { addMonths, monthIndex, toYearMonth } from "./dates";
import { toMonthlyCents } from "./money";
import type { OneOff } from "./projection";
import type { BudgetLine, Cents, Income, ISODate, PlanSettings, YearMonth } from "./types";

export type Budget = { incomeCents: Cents; expensesCents: Cents; roomCents: Cents };
export type BudgetWarning = { key: "negative_budget" } | { key: "over_target"; wantCents: Cents; roomCents: Cents };

// Spec 5.1. Careful mode counts the low amount of variable income (spec 5.4).
export function monthlyBudget(incomes: Income[], lines: BudgetLine[], mode: "careful" | "normal"): Budget {
  const incomeCents = incomes
    .filter((i) => i.active)
    .reduce((sum, i) => {
      const amount = mode === "careful" && i.variability === "variable" ? (i.amountLowCents ?? i.amountCents) : i.amountCents;
      return sum + toMonthlyCents(amount, i.frequency);
    }, 0);
  const expensesCents = lines.reduce((sum, l) => sum + l.amountCents, 0);
  return { incomeCents, expensesCents, roomCents: incomeCents - expensesCents };
}

// Spec 5.1: the target when one is set, otherwise it follows the room.
export function savingsPerMonth(plan: PlanSettings, roomCents: Cents): Cents {
  return plan.monthlySavingsCents ?? Math.max(0, roomCents);
}

// 20 % of income rounded to € 10, in one division so exact halves stay exact.
export function suggestedSavings(incomeCents: Cents): Cents {
  return Math.round(incomeCents / 5000) * 1000;
}

export function suggestedEmergencyTarget(expensesCents: Cents): Cents {
  return expensesCents > 0 ? expensesCents * 3 : 100000;
}

export function budgetWarnings(plan: PlanSettings, budget: Budget): BudgetWarning[] {
  const warnings: BudgetWarning[] = [];
  if (budget.roomCents < 0) warnings.push({ key: "negative_budget" });
  if (plan.monthlySavingsCents !== null && plan.monthlySavingsCents > budget.roomCents) {
    warnings.push({ key: "over_target", wantCents: plan.monthlySavingsCents, roomCents: budget.roomCents });
  }
  return warnings;
}

// Spec 5.4: yearly income counts in its month every year of the horizon, once income on its date.
// Always the full amount, never the low one.
export function oneOffIncomes(incomes: Income[], fromPeriodStart: ISODate, startMonth: YearMonth, horizon: number): OneOff[] {
  const out: OneOff[] = [];
  for (const i of incomes) {
    if (!i.active) continue;
    if (i.frequency === "yearly" && i.month !== null) {
      for (let k = 0; k < horizon; k++) {
        const month = addMonths(startMonth, k);
        if (month.month === i.month) out.push({ month, cents: i.amountCents });
      }
    } else if (i.frequency === "once" && i.date !== null && i.date >= fromPeriodStart) {
      out.push({ month: toYearMonth(i.date), cents: i.amountCents });
    }
  }
  return out.sort((a, b) => monthIndex(a.month) - monthIndex(b.month));
}
