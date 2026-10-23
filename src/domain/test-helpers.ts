import type { BudgetLine, Cents, Goal, Income, PlanSettings, YearMonth } from "./types";

type Opts = { balance?: Cents; deadline?: YearMonth; priority?: number; weight?: number; archived?: boolean; createdAt?: string };

export function goal(id: string, target: Cents, opts: Opts = {}): Goal {
  return {
    id,
    kind: "savings",
    name: id,
    targetCents: target,
    targetIsEstimate: false,
    balanceCents: opts.balance ?? 0,
    deadline: opts.deadline ?? null,
    priority: opts.priority ?? 1,
    weight: opts.weight ?? 1,
    isMain: false,
    archived: opts.archived ?? false,
    createdAt: opts.createdAt ?? "2026-01-01T00:00:00Z",
    colorToken: null,
  };
}

export function emergency(target: Cents, balance: Cents = 0): Goal {
  return { ...goal("nood", target, { balance }), kind: "emergency" };
}

// Default: active monthly fixed salary of € 2.000, paid on the 25th (weekend: before).
export function income(overrides: Partial<Income> = {}): Income {
  return {
    id: "salaris",
    name: "Salaris",
    kind: "salary",
    frequency: "monthly",
    amountCents: 200000,
    amountLowCents: null,
    variability: "fixed",
    month: null,
    date: null,
    paydayRule: { type: "day_of_month", day: 25, weekend: "before" },
    isEstimate: false,
    active: true,
    ...overrides,
  };
}

export function line(kind: BudgetLine["kind"], amountCents: Cents): BudgetLine {
  return { id: `${kind}-${amountCents}`, kind, category: "overig", name: kind, amountCents, isEstimate: false };
}

export function plan(overrides: Partial<PlanSettings> = {}): PlanSettings {
  return { monthlySavingsCents: null, emergencySharePct: 100, incomeMode: "normal", includeOneOffIncome: false, ...overrides };
}
