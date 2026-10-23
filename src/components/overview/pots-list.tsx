import Link from "next/link";
import { Money } from "@/components/money";
import { ProgressBar } from "@/components/progress-bar";
import { CertaintyLabel } from "@/components/certainty-label";
import type { GoalView } from "@/domain/dashboard";
import { fillText, PeriodSaved, potColor, StatusBadge } from "./labels";

export function PotsList({ goals, horizonYears }: { goals: GoalView[]; horizonYears: number }) {
  return (
    <section aria-label="Je potten" className="flex flex-col gap-4 rounded-card bg-surface p-5">
      <h2 className="font-display text-xl font-semibold">
        Je potten
      </h2>
      {goals.length === 0 ? (
        <>
          <p className="text-ink-2">Nog geen potten.</p>
          <Link href="/doelen/nieuw" className="inline-flex h-11 items-center self-start rounded-md px-2 text-sm font-semibold underline underline-offset-4">
            Maak je eerste doel
          </Link>
        </>
      ) : (
        <ul className="flex flex-col gap-5">
          {goals.map((g) => (
            <li key={g.id} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-semibold">{g.name}</h3>
                <Money cents={g.balanceCents} className="text-right" />
              </div>
              <ProgressBar value={g.isFull ? 1 : g.balanceCents / g.targetCents} label={`Voortgang ${g.name}`} color={potColor(g)} />
              <div className="flex items-baseline justify-between gap-3 text-sm text-ink-2">
                <p>
                  {fillText(g.fill, horizonYears)} · <CertaintyLabel level={g.fillCertainty.level} reason={g.fillCertainty.reason} />
                </p>
                <p className="text-right">
                  van <Money cents={g.targetCents} className="font-semibold text-ink" />
                </p>
              </div>
              {(g.status || g.allocatedCents > 0) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
                  <StatusBadge status={g.status} />
                  {g.allocatedCents > 0 && <PeriodSaved goal={g} />}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
