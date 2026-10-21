import { oneOffIncomes } from "@/domain/budget";
import { goalUnreachableTitle } from "@/domain/checklist-rules";
import { formatMonthNl, toYearMonth } from "@/domain/dates";
import { parseEuroInput } from "@/domain/money";
import { compareProjections, extraNeededCents, fillMonth, goalStatus, horizonFor, project, type GoalStatus, type ProjectionInput } from "@/domain/projection";
import type { Goal, Income, ISODate, YearMonth } from "@/domain/types";

// The texts of the goal form. The deadline is a month as <input type="month"> gives it ("2027-03"), or empty.
export type Draft = { name: string; target: string; deadline: string };
export type Effect = { subject: { name: string; headline: string; status: GoalStatus | null; advice: string | null } | null; shifts: string[] };

const MONTH = /^(19|20|21)\d\d-(0[1-9]|1[0-2])$/; // the same months saveGoalAction accepts

// The goals as they would be after saving the form, or null while the form is not complete enough to preview.
// A new goal goes last; an existing one keeps everything the form does not edit.
export function draftGoals(goals: Goal[], draft: Draft, existing: Goal | null): Goal[] | null {
  const name = draft.name.trim();
  const targetCents = parseEuroInput(draft.target);
  const month = draft.deadline.trim();
  if (!name || !targetCents || (month && !MONTH.test(month))) return null;
  const edited = { name, targetCents, deadline: month ? toYearMonth(`${month}-01`) : null };
  if (existing) return goals.map((g) => (g.id === existing.id ? { ...g, ...edited } : g));
  const priority = Math.max(0, ...goals.map((g) => g.priority)) + 1;
  // createdAt sorts last, so the new goal loses every tie in the allocation, as it will after saving.
  return [...goals, { id: "nieuw", kind: "other", ...edited, targetIsEstimate: false, balanceCents: 0, priority, weight: 1, isMain: false, archived: false, createdAt: "9999-12-31T00:00:00Z" }];
}

// Projections only compare when they cover the same months, so both run on the longer of the two horizons, and the
// one-off income (which repeats every year of the horizon) is built for that horizon.
const horizonOf = (...inputs: ProjectionInput[]) => Math.max(...inputs.map((i) => Math.max(i.horizon ?? 0, horizonFor(i.goals, i.startMonth))));

export function previewInputs(base: ProjectionInput, goalsAfter: Goal[], oneOff: { incomes: Income[]; periodStart: ISODate } | null): { before: ProjectionInput; after: ProjectionInput } {
  const after = { ...base, goals: goalsAfter };
  const horizon = horizonOf(base, after);
  const oneOffs = oneOff ? oneOffIncomes(oneOff.incomes, oneOff.periodStart, base.startMonth, horizon) : [];
  return { before: { ...base, horizon, oneOffs }, after: { ...after, horizon, oneOffs } };
}

// The goal that is new or edited: the first one of `after` that differs from its twin in `before`.
const changedGoal = (before: Goal[], after: Goal[]) => after.find((g) => JSON.stringify(g) !== JSON.stringify(before.find((x) => x.id === g.id)));

// Spec 5.4: the goal itself ("Klaar rond jul 2027", with its status), and per other goal how many months it moves.
export function effectOf(before: ProjectionInput, after: ProjectionInput): Effect {
  const horizon = horizonOf(before, after);
  const [was, now] = [project({ ...before, horizon }), project({ ...after, horizon })];
  const years = Math.floor(horizon / 12);
  const when = (f: YearMonth | "full" | null) => (f === "full" ? "al vol" : f ? formatMonthNl(f) : `niet binnen ${years} jaar`);
  const changed = changedGoal(before.goals, after.goals);
  const names = new Map(after.goals.map((g) => [g.id, g.name]));

  const shifts = compareProjections(was, now, after.startMonth)
    .filter((s) => s.goalId !== changed?.id)
    .map(({ goalId, from, to, deltaMonths: n }) => {
      const name = names.get(goalId);
      if (!n) return `${name} gaat van ${when(from)} naar ${when(to)}`;
      const months = `${Math.abs(n)} ${Math.abs(n) === 1 ? "maand" : "maanden"}`;
      return `${name} ${n > 0 ? `schuift ${months} op` : `komt ${months} vroeger`}, van ${when(from)} naar ${when(to)}`;
    });
  if (!changed) return { subject: null, shifts };

  const fill = fillMonth(now.fill[changed.id], after.startMonth);
  const old = changed.id in was.fill ? fillMonth(was.fill[changed.id], after.startMonth) : undefined;
  const headline = fill === "full" ? "Al vol" : fill ? `Klaar rond ${formatMonthNl(fill)}` : `Niet vol binnen ${years} jaar`;
  const status = goalStatus({ ...after, horizon }, changed.id);
  return {
    subject: {
      name: changed.name,
      headline: old !== undefined && when(old) !== when(fill) ? `${headline} (was ${when(old)})` : headline,
      status,
      advice: status === "niet_haalbaar" ? goalUnreachableTitle(changed.name, extraNeededCents({ ...after, horizon }, changed.id)) : null,
    },
    shifts,
  };
}
