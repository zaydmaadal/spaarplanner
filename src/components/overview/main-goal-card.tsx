import { CertaintyMeter } from "@/components/certainty-meter";
import { CountUp } from "@/components/count-up";
import { Money } from "@/components/money";
import { ProgressBar } from "@/components/progress-bar";
import type { Dashboard, GoalView } from "@/domain/dashboard";
import { formatMonthNl } from "@/domain/dates";
import { cn } from "@/lib/utils";
import { fillText, StatusBadge } from "./labels";

// The one big figure of the screen is what is saved for the main goal, in the display serif on the dark hero.
export function MainGoalCard({ goal, waitsFor, horizonYears, className }: { goal: GoalView; waitsFor: Dashboard["mainGoalWaitsFor"]; horizonYears: number; className?: string }) {
  return (
    <section aria-label={goal.name} className={cn("flex flex-col gap-2.5 text-hero-ink", className)}>
      <div className="flex flex-col">
        <p className="text-sm font-semibold text-hero-accent">Hoofddoel</p>
        <h2 className="font-display text-2xl font-bold break-words">{goal.name}</h2>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <CountUp cents={goal.balanceCents} className="text-4xl leading-none font-bold min-[400px]:text-5xl lg:text-6xl" />
        <p className="text-hero-muted">
          van <Money cents={goal.targetCents} className="text-hero-ink" />
        </p>
      </div>
      <ProgressBar value={goal.isFull ? 1 : goal.balanceCents / goal.targetCents} label={`Voortgang ${goal.name}`} color="var(--color-hero-accent)" className="h-3 bg-hero-track" />
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold first-letter:uppercase">{fillText(goal.fill, horizonYears)}</p>
        <StatusBadge status={goal.status} />
      </div>
      {waitsFor && (
        <p className="rounded-strip border border-hero-line bg-hero-tile p-3 text-sm">
          Krijgt nu nog niets: eerst je noodfonds{waitsFor.fill ? `, vol rond ${formatMonthNl(waitsFor.fill)}` : ""}.
        </p>
      )}
      <CertaintyMeter onHero level={goal.fillCertainty.level} reason={goal.fillCertainty.reason} />
    </section>
  );
}
