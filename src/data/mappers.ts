import type { Tables } from "@/data/database.types";
import type { UserData } from "@/domain/dashboard";
import { toYearMonth } from "@/domain/dates";
import type { BudgetLine, Cents, Goal, Income, PlanSettings } from "@/domain/types";

// The enum-like columns are plain text in the generated types; the CHECKs in the migration guarantee the values,
// so the casts below only restate what the database already enforces.

export function toIncome(row: Tables<"income_sources">): Income {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as Income["kind"],
    frequency: row.frequency as Income["frequency"],
    amountCents: row.amount_cents,
    amountLowCents: row.amount_low_cents,
    variability: row.variability as Income["variability"],
    month: row.month,
    date: row.date,
    paydayRule: row.payday_rule as Income["paydayRule"],
    isEstimate: row.is_estimate,
    active: row.active,
  };
}

export function toBudgetLine(row: Tables<"budget_lines">): BudgetLine {
  return {
    id: row.id,
    kind: row.kind as BudgetLine["kind"],
    category: row.category,
    name: row.name,
    amountCents: row.amount_cents,
    isEstimate: row.is_estimate,
  };
}

// The balance is the sum of the transactions (view goal_balances); the deadline date becomes its month.
export function toGoal(row: Tables<"goals">, balanceCents: Cents): Goal {
  return {
    id: row.id,
    kind: row.kind as Goal["kind"],
    name: row.name,
    targetCents: row.target_cents,
    targetIsEstimate: row.target_is_estimate,
    balanceCents,
    deadline: row.deadline ? toYearMonth(row.deadline) : null,
    priority: row.priority,
    weight: row.weight,
    isMain: row.is_main,
    archived: row.status === "archived",
    createdAt: row.created_at,
  };
}

export function toPlan(row: Tables<"plans">): PlanSettings {
  return {
    monthlySavingsCents: row.monthly_savings_cents,
    emergencySharePct: row.emergency_share_pct,
    incomeMode: row.income_mode as PlanSettings["incomeMode"],
    includeOneOffIncome: row.include_one_off_income,
  };
}

const flag = (v: unknown) => (typeof v === "boolean" ? v : undefined);

export function toProfile(row: Tables<"profiles">): UserData["profile"] {
  const prefs = typeof row.prefs === "object" && row.prefs !== null && !Array.isArray(row.prefs) ? row.prefs : {};
  return {
    displayName: row.display_name ?? "",
    timeZone: row.timezone,
    prefs: { firstJob: flag(prefs.first_job), noInterestSavings: flag(prefs.no_interest_savings) },
  };
}
