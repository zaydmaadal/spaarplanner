import Link from "next/link";
import { CertaintyLabel } from "@/components/certainty-label";
import { Money } from "@/components/money";
import { ProgressBar } from "@/components/progress-bar";
import type { GoalView } from "@/domain/dashboard";
import { stagger } from "@/lib/utils";
import { fillText, PeriodSaved, potColor, StatusBadge } from "./labels";

// Every pot is a tile in its own colour: 2 across on the phone, 4 from 1024 px.
export function PotsList({ goals, horizonYears }: { goals: GoalView[]; horizonYears: number }) {
  return (
    <section aria-label="Je potten" className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-semibold">Je potten</h2>
      {goals.length === 0 ? (
        <div className="flex flex-col gap-1 rounded-card bg-surface p-4">
          <p className="text-ink-2">Nog geen potten.</p>
          <Link href="/doelen/nieuw" className="inline-flex h-11 items-center self-start rounded-md px-2 text-sm font-semibold underline underline-offset-4">
            Maak je eerste doel
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {goals.map((g, i) => (
            <li key={g.id} className="rise flex flex-col gap-1.5 rounded-card bg-surface p-3 shadow-card" style={stagger(i + 1)}>
              <div className="flex items-center gap-2">
                <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: potColor(g) }} />
                <h3 className="min-w-0 text-sm font-semibold break-words">{g.name}</h3>
              </div>
              <Money cents={g.balanceCents} className="font-display text-xl leading-tight" />
              <p className="text-xs text-ink-2">
                van <Money cents={g.targetCents} className="font-semibold text-ink" />
              </p>
              <ProgressBar value={g.isFull ? 1 : g.balanceCents / g.targetCents} label={`Voortgang ${g.name}`} color={potColor(g)} className="h-1.5" />
              <p className="text-xs text-ink-2">
                {fillText(g.fill, horizonYears)} · <CertaintyLabel level={g.fillCertainty.level} reason={g.fillCertainty.reason} />
              </p>
              {(g.status || g.allocatedCents > 0) && (
                <div className="flex flex-col items-start gap-1 text-xs text-ink-2">
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
