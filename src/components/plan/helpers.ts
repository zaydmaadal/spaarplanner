import { URGENCY_RANK, type Urgency } from "@/domain/checklist-rules";
import type { YearMonth } from "@/domain/types";

// A step in the checklist: a rule step is closed by its rule key, a step the user wrote by its row id.
export type PlanStep = { key: string; title: string; urgency: Urgency; source: "rule" | "user" };

const NEVER = Number.MAX_SAFE_INTEGER;

// The timeline (spec 8.6): soonest first. A full pot comes first, one that does not fill within the horizon last.
// The sort is stable, so pots that fill in the same month keep their priority order.
export function byFill<G extends { fill: YearMonth | "full" | null }>(goals: G[]): G[] {
  const when = ({ fill }: G) => (fill === "full" ? -1 : fill === null ? NEVER : fill.year * 12 + fill.month);
  return [...goals].sort((a, b) => when(a) - when(b));
}

// The checklist per urgency (spec 8.6), most urgent first, empty groups left out. Rule steps come before own steps.
export function checklistGroups(
  rules: { key: string; title: string; urgency: Urgency }[],
  own: { id: string; title: string; urgency: Urgency }[],
): { urgency: Urgency; steps: PlanStep[] }[] {
  const steps: PlanStep[] = [
    ...rules.map(({ key, title, urgency }) => ({ key, title, urgency, source: "rule" as const })),
    ...own.map(({ id, title, urgency }) => ({ key: id, title, urgency, source: "user" as const })),
  ];
  return (Object.keys(URGENCY_RANK) as Urgency[])
    .sort((a, b) => URGENCY_RANK[a] - URGENCY_RANK[b])
    .map((urgency) => ({ urgency, steps: steps.filter((s) => s.urgency === urgency) }))
    .filter((g) => g.steps.length > 0);
}
