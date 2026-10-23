import Link from "next/link";
import type { ReactNode } from "react";
import { CertaintyLabel } from "@/components/certainty-label";
import { Money } from "@/components/money";
import { fillText, PeriodSaved, potColor, StatusBadge } from "@/components/overview/labels";
import { ProgressBar } from "@/components/progress-bar";
import type { GoalView } from "@/domain/dashboard";

// One pot in the list (spec 8.4): balance, progress in its own colour, fill month. The whole card is the link (the name's
// ::after covers it); the drag handle sits above that layer.
export function GoalCard({ goal, horizonYears, handle }: { goal: GoalView; horizonYears: number; handle: ReactNode }) {
  return (
    <div className="press relative flex h-full flex-col gap-1.5 rounded-card bg-surface p-4 shadow-card transition-colors duration-(--duration-1) has-[a:active]:bg-tint">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <span aria-hidden className="mt-2 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: potColor(goal) }} />
          <div className="flex min-w-0 flex-col">
            <h2 className="font-display text-xl font-semibold break-words">
              <Link href={`/doelen/${goal.id}`} className="rounded-md after:absolute after:inset-0 after:rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
                {goal.name}
              </Link>
            </h2>
            {goal.isMain && <p className="text-xs font-semibold tracking-wide text-ink-2 uppercase">Hoofddoel</p>}
          </div>
        </div>
        {handle}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <Money cents={goal.balanceCents} className="text-2xl" />
        <p className="text-right text-sm text-ink-2">
          van <Money cents={goal.targetCents} className="font-semibold text-ink" />
        </p>
      </div>
      <ProgressBar value={goal.isFull ? 1 : goal.balanceCents / goal.targetCents} label={`Voortgang ${goal.name}`} color={potColor(goal)} />
      <p className="text-sm text-ink-2">
        {fillText(goal.fill, horizonYears)} · <CertaintyLabel level={goal.fillCertainty.level} reason={goal.fillCertainty.reason} />
      </p>
      {(goal.status || goal.allocatedCents > 0) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
          <StatusBadge status={goal.status} />
          {goal.allocatedCents > 0 && <PeriodSaved goal={goal} />}
        </div>
      )}
    </div>
  );
}
