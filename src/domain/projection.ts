import { allocate } from "./allocation";
import { addMonths, monthIndex, monthsInclusive } from "./dates";
import type { Cents, Goal, YearMonth } from "./types";

export type OneOff = { month: YearMonth; cents: Cents };
export type ProjectionInput = {
  goals: Goal[];
  savingsCents: Cents;
  emergencySharePct: number;
  startMonth: YearMonth;
  depositedThisPeriodCents: Cents;
  oneOffs: OneOff[];
  horizon?: number; // periods to project; defaults to horizonFor, set it to compare projections over the same length
};
export type Fill = number | "full" | null; // period index k, already full, or not within horizon
export type Projection = { fill: Record<string, Fill>; horizon: number };
export type GoalStatus = "op_schema" | "krap" | "niet_haalbaar";
export type Shift = { goalId: string; from: YearMonth | "full" | null; to: YearMonth | "full" | null; deltaMonths: number | null };

export const EXTRA_NEEDED_CAP: Cents = 10_000_000; // returned by extraNeededCents when no amount within it is enough
const EXTRA_CAP_EUROS = EXTRA_NEEDED_CAP / 100;

export function horizonFor(goals: Goal[], startMonth: YearMonth): number {
  const months = goals.flatMap((g) => (g.archived || !g.deadline ? [] : [monthsInclusive(startMonth, g.deadline)]));
  return Math.min(480, Math.max(120, ...months));
}

// Spec 5.4: the one-off joins the savings target of period 0, then the booked deposits come off.
export function periodZeroAvailable(savingsCents: Cents, oneOffZeroCents: Cents, depositedCents: Cents): Cents {
  return Math.max(0, savingsCents + oneOffZeroCents - depositedCents);
}

export function oneOffIn(oneOffs: OneOff[], month: YearMonth): Cents {
  return oneOffs.filter((o) => monthIndex(o.month) === monthIndex(month)).reduce((sum, o) => sum + o.cents, 0);
}

// Spec 5.4: period by period, allocate (5.3), add the amounts to the balances, note the first period a goal is full.
export function project(input: ProjectionInput): Projection {
  const { savingsCents, emergencySharePct, startMonth, depositedThisPeriodCents, oneOffs } = input;
  let goals = input.goals.filter((g) => !g.archived);
  const horizon = input.horizon ?? horizonFor(goals, startMonth);
  const fill: Record<string, Fill> = Object.fromEntries(goals.map((g) => [g.id, g.balanceCents >= g.targetCents ? "full" : null]));

  for (let k = 0; k < horizon; k++) {
    const month = addMonths(startMonth, k);
    const oneOff = oneOffIn(oneOffs, month);
    const available = k === 0 ? periodZeroAvailable(savingsCents, oneOff, depositedThisPeriodCents) : savingsCents + oneOff;
    const got = allocate(available, goals, emergencySharePct, month);
    goals = goals.map((g) => ({ ...g, balanceCents: g.balanceCents + (got[g.id] ?? 0) }));
    for (const g of goals) if (fill[g.id] === null && g.balanceCents >= g.targetCents) fill[g.id] = k;
  }
  return { fill, horizon };
}

export function fillMonth(fill: Fill, startMonth: YearMonth): YearMonth | "full" | null {
  return typeof fill === "number" ? addMonths(startMonth, fill) : fill;
}

// Full at the latest in the deadline month (a goal that is already full counts).
function fullByDeadline(input: ProjectionInput, goal: Goal & { deadline: YearMonth }): boolean {
  const f = project(input).fill[goal.id];
  return f === "full" || (typeof f === "number" && f <= monthIndex(goal.deadline) - monthIndex(input.startMonth));
}

function withDeadline(input: ProjectionInput, goalId: string) {
  const g = input.goals.find((x) => x.id === goalId);
  return g && !g.archived && g.deadline ? { ...g, deadline: g.deadline } : null;
}

export function goalStatus(input: ProjectionInput, goalId: string): GoalStatus | null {
  const g = withDeadline(input, goalId);
  if (!g) return null;
  if (!fullByDeadline(input, g)) return "niet_haalbaar";
  return fullByDeadline({ ...input, savingsCents: Math.floor(input.savingsCents * 0.9) }, g) ? "op_schema" : "krap";
}

// Smallest whole-euro increase per month that makes the goal full by its deadline; the cap if even that is not enough.
export function extraNeededCents(input: ProjectionInput, goalId: string): Cents {
  const g = withDeadline(input, goalId);
  if (!g || goalStatus(input, goalId) !== "niet_haalbaar") return 0;
  const works = (euros: number) => fullByDeadline({ ...input, savingsCents: input.savingsCents + euros * 100 }, g);
  if (!works(EXTRA_CAP_EUROS)) return EXTRA_NEEDED_CAP;
  let lo = 1;
  let hi = EXTRA_CAP_EUROS;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (works(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo * 100;
}

// Goals of `after` whose fill changed; a goal missing from `before` counts as not within the horizon.
export function compareProjections(before: Projection, after: Projection, startMonth: YearMonth): Shift[] {
  return Object.entries(after.fill).flatMap(([goalId, to]) => {
    const from = before.fill[goalId] ?? null;
    if (from === to) return [];
    return [{ goalId, from: fillMonth(from, startMonth), to: fillMonth(to, startMonth), deltaMonths: typeof from === "number" && typeof to === "number" ? to - from : null }];
  });
}
