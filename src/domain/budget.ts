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

// Spec 5.1 standard proposal: with no plan amount and no budget lines the room is just the income, so propose 20 % instead.
// A proposal is shown, never stored as the plan amount.
export function savingsTarget(plan: PlanSettings, budget: Budget, hasBudgetLines: boolean): { cents: Cents; isProposal: boolean } {
  const isProposal = plan.monthlySavingsCents === null && !hasBudgetLines;
  return { cents: isProposal ? suggestedSavings(budget.incomeCents) : savingsPerMonth(plan, budget.roomCents), isProposal };
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
  // On a negative room "je wil sparen maar houdt over" would read oddly, so only negative_budget shows.
  else if (plan.monthlySavingsCents !== null && plan.monthlySavingsCents > budget.roomCents) {
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
      // shortcut: a one-off counts in the period whose month equals its calendar month; use the containing period once payday rules are passed in
      out.push({ month: toYearMonth(i.date), cents: i.amountCents });
    }
  }
  return out.sort((a, b) => monthIndex(a.month) - monthIndex(b.month));
}
