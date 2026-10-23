import { fillMonth, project } from "@/domain/projection";
import type { Cents, Goal, YearMonth } from "@/domain/types";

export type PreviewGoal = { id: string; name: string; targetCents: Cents; deadline: YearMonth | null };
export type PreviewLine = { name: string; fill: YearMonth | "full" | null };

// Step 7 of the onboarding: the emergency fund does not exist yet, so it joins the projection as a provisional goal.
export function previewTimeline(input: {
  fund: { targetCents: Cents; balanceCents: Cents };
  goals: PreviewGoal[];
  savingsCents: Cents;
  sharePct: number;
  startMonth: YearMonth;
}): { lines: PreviewLine[]; horizonYears: number } {
  const goal = (g: PreviewGoal, i: number, extra: Partial<Goal> = {}): Goal => ({
    id: g.id,
    kind: "savings",
    name: g.name,
    targetCents: g.targetCents,
    targetIsEstimate: false,
    balanceCents: 0,
    deadline: g.deadline,
    priority: i + 2,
    weight: 1,
    isMain: false,
    archived: false,
    createdAt: String(i).padStart(4, "0"), // keeps the order the goals were added in
    colorToken: null,
    ...extra,
  });
  const fund = goal({ id: "fund", name: "Noodfonds", targetCents: input.fund.targetCents, deadline: null }, -1, {
    kind: "emergency",
    balanceCents: input.fund.balanceCents,
    priority: 1,
  });
  const goals = [fund, ...input.goals.map((g, i) => goal(g, i))];
  const { fill, horizon } = project({
    goals,
    savingsCents: input.savingsCents,
    emergencySharePct: input.sharePct,
    startMonth: input.startMonth,
    depositedThisPeriodCents: 0,
    oneOffs: [],
  });
  return { lines: goals.map((g) => ({ name: g.name, fill: fillMonth(fill[g.id], input.startMonth) })), horizonYears: Math.floor(horizon / 12) };
}
