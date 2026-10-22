import Link from "next/link";
import { Money } from "@/components/money";
import { ProgressBar } from "@/components/progress-bar";
import { fillText, potColor, StatusBadge } from "@/components/overview/labels";
import { CERTAINTY_LABEL } from "@/domain/certainty";
import type { GoalView } from "@/domain/dashboard";
import { ReorderButtons } from "./reorder-buttons";

// One pot in the list (spec 8.4): balance, progress, fill month. `ids` is the list in order, for the arrows.
export function GoalCard({ goal, index, ids, horizonYears }: { goal: GoalView; index: number; ids: string[]; horizonYears: number }) {
  return (
    <li className="flex flex-col gap-2 rounded-card bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h2 className="font-display text-xl font-semibold break-words">
            <Link href={`/doelen/${goal.id}`} className="inline-flex min-h-11 items-center rounded-md underline-offset-4 hover:underline">
              {goal.name}
            </Link>
          </h2>
          {goal.isMain && <p className="text-sm font-semibold text-ink-2">Hoofddoel</p>}
        </div>
        <ReorderButtons ids={ids} id={goal.id} name={goal.name} />
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <Money cents={goal.balanceCents} className="text-xl" />
        <p className="text-right text-sm text-ink-2">
          van <Money cents={goal.targetCents} className="font-semibold text-ink" />
        </p>
      </div>
      <ProgressBar value={goal.isFull ? 1 : goal.balanceCents / goal.targetCents} label={`Voortgang ${goal.name}`} color={potColor(index)} />
      <p className="text-sm text-ink-2">
        {fillText(goal.fill, horizonYears)} · {CERTAINTY_LABEL[goal.fillCertainty.level]}
      </p>
      {(goal.status || goal.allocatedCents > 0) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
          <StatusBadge status={goal.status} />
          {goal.allocatedCents > 0 && (
            <p>
              Deze periode: <Money cents={goal.allocatedCents} className="font-semibold text-ink" />
            </p>
          )}
        </div>
      )}
    </li>
  );
}
