import type { Cents, Goal, YearMonth } from "./types";

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
  };
}

export function emergency(target: Cents, balance: Cents = 0): Goal {
  return { ...goal("nood", target, { balance }), kind: "emergency" };
}
