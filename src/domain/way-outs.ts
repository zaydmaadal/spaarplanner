import { addMonths } from "./dates";
import { EXTRA_NEEDED_CAP, extraNeededCents, fullByDeadline, goalStatus, project, type ProjectionInput } from "./projection";
import type { Cents, YearMonth } from "./types";

// The ways out of a goal that is not full in time ("niet haalbaar"), each worked out with the projection:
// save more per month, move the deadline to the month the goal is full with the current plan, or lower the target
// to the highest whole euro amount that is full at the deadline. A way that does not exist (no amount of extra
// savings is enough, never full within the horizon, no target above the balance works) is left out.
export type WayOut = { kind: "save_more"; extraCents: Cents } | { kind: "move_deadline"; month: YearMonth } | { kind: "lower_target"; targetCents: Cents };

export function wayOuts(input: ProjectionInput, goalId: string): WayOut[] {
  const goal = input.goals.find((g) => g.id === goalId);
  if (!goal || goal.archived || !goal.deadline || goalStatus(input, goalId) !== "niet_haalbaar") return [];
  const deadline = goal.deadline;
  const ways: WayOut[] = [];

  const extra = extraNeededCents(input, goalId);
  if (extra < EXTRA_NEEDED_CAP) ways.push({ kind: "save_more", extraCents: extra });

  const fill = project(input).fill[goalId];
  if (typeof fill === "number") ways.push({ kind: "move_deadline", month: addMonths(input.startMonth, fill) });

  // Full by the deadline only gets easier when the target goes down: binary search on whole euros.
  const works = (euros: number) => {
    const lowered = { ...goal, targetCents: euros * 100, deadline };
    return fullByDeadline({ ...input, goals: input.goals.map((g) => (g.id === goalId ? lowered : g)) }, lowered);
  };
  let lo = Math.max(1, Math.ceil(goal.balanceCents / 100)); // a target at or under the balance is full already
  let hi = Math.ceil(goal.targetCents / 100) - 1;
  if (hi >= lo && works(lo)) {
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (works(mid)) lo = mid;
      else hi = mid - 1;
    }
    ways.push({ kind: "lower_target", targetCents: lo * 100 });
  }
  return ways;
}
