import Link from "next/link";
import type { ReactNode } from "react";
import { Money } from "@/components/money";
import { ProgressBar } from "@/components/progress-bar";
import { fillText, PeriodSaved, potColor, StatusBadge } from "@/components/overview/labels";
import { CertaintyLabel } from "@/components/certainty-label";
import type { GoalView } from "@/domain/dashboard";

// One pot in the list (spec 8.4): balance, progress, fill month. The whole card is the link (the name's ::after covers
// it); the drag handle sits above that layer.
export function GoalCard({ goal, horizonYears, handle }: { goal: GoalView; horizonYears: number; handle: ReactNode }) {
  return (
    <div className="relative flex flex-col gap-2 rounded-card bg-surface p-5 transition-colors duration-(--duration-1) has-[a:active]:bg-tint">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h2 className="font-display text-xl font-semibold break-words">
            <Link href={`/doelen/${goal.id}`} className="rounded-md after:absolute after:inset-0 after:rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
              {goal.name}
            </Link>
          </h2>
          {goal.isMain && <p className="text-sm font-semibold text-ink-2">Hoofddoel</p>}
        </div>
        {handle}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <Money cents={goal.balanceCents} className="text-xl" />
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
