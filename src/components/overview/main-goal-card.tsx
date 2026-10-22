import { CertaintyMeter } from "@/components/certainty-meter";
import { Money } from "@/components/money";
import { ProgressBar } from "@/components/progress-bar";
import type { Dashboard, GoalView } from "@/domain/dashboard";
import { formatMonthNl } from "@/domain/dates";
import { fillText, StatusBadge } from "./labels";

// The one big figure of the screen is what is saved for the main goal (DESIGN.md: one main figure, 32 px).
export function MainGoalCard({ goal, waitsFor, horizonYears }: { goal: GoalView; waitsFor: Dashboard["mainGoalWaitsFor"]; horizonYears: number }) {
  return (
    <section aria-label={goal.name} className="flex flex-col gap-4 rounded-hero bg-surface p-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-ink-2">Hoofddoel</p>
        <h2 className="font-display text-2xl font-semibold">
          {goal.name}
        </h2>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <Money cents={goal.balanceCents} className="text-[2rem] leading-none" />
        <p className="text-right text-ink-2">
          van <Money cents={goal.targetCents} className="text-ink" />
        </p>
      </div>
      <ProgressBar value={goal.isFull ? 1 : goal.balanceCents / goal.targetCents} label={`Voortgang ${goal.name}`} />
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold first-letter:uppercase">{fillText(goal.fill, horizonYears)}</p>
        <StatusBadge status={goal.status} />
      </div>
      {waitsFor && (
        <p className="rounded-strip bg-tint p-3 text-sm">
          Krijgt nu nog niets: eerst je noodfonds{waitsFor.fill ? `, vol rond ${formatMonthNl(waitsFor.fill)}` : ""}.
        </p>
      )}
      <CertaintyMeter level={goal.fillCertainty.level} reason={goal.fillCertainty.reason} />
    </section>
  );
}
