import Link from "next/link";
import { CertaintyLabel } from "@/components/certainty-label";
import { Money } from "@/components/money";
import { fillText, potColor, StatusBadge } from "@/components/overview/labels";
import { ProgressBar } from "@/components/progress-bar";
import type { GoalView } from "@/domain/dashboard";
import { formatMonthNl } from "@/domain/dates";
import { stagger } from "@/lib/utils";
import { byFill } from "./helpers";

// Spec 8.6: the pots in the order they fill, as a route. One line runs through the dots; a dot has the colour of its pot
// and is filled once the pot is full. The month is the milestone; "vol" and "niet binnen 10 jaar" take its place for a
// pot that is full or does not fill within the horizon.
export function Timeline({ goals, horizonYears }: { goals: GoalView[]; horizonYears: number }) {
  return (
    <section aria-label="Tijdlijn" className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card">
      <h2 className="font-display text-xl font-semibold">Tijdlijn</h2>
      {goals.length === 0 ? (
        <>
          <p className="text-ink-2">Nog geen doelen.</p>
          <Link href="/doelen/nieuw" className="inline-flex h-11 items-center self-start rounded-md px-2 text-sm font-semibold underline underline-offset-4">
            Maak je eerste doel
          </Link>
        </>
      ) : (
        <ol className="relative flex flex-col before:absolute before:top-3 before:bottom-3 before:left-[9px] before:w-0.5 before:bg-hairline">
          {byFill(goals).map((g, i) => (
            <li key={g.id} className="rise relative flex flex-col gap-1 pb-4 pl-9 last:pb-0" style={stagger(i + 1)}>
              <span
                aria-hidden
                className="absolute top-1 left-0 size-5 rounded-full border-4 bg-surface"
                style={{ borderColor: potColor(g), ...(g.isFull && { backgroundColor: potColor(g) }) }}
              />
              <p className="font-display text-lg leading-tight font-semibold first-letter:uppercase">{g.fill && g.fill !== "full" ? formatMonthNl(g.fill) : fillText(g.fill, horizonYears)}</p>
              <h3 className="font-semibold break-words">{g.name}</h3>
              <ProgressBar value={g.isFull ? 1 : g.balanceCents / g.targetCents} label={`Voortgang ${g.name}`} color={potColor(g)} className="h-1.5" />
              <p className="text-sm text-ink-2">
                <Money cents={g.balanceCents} className="font-semibold text-ink" /> van <Money cents={g.targetCents} className="font-semibold text-ink" /> · <CertaintyLabel level={g.fillCertainty.level} reason={g.fillCertainty.reason} />
              </p>
              {g.status && (
                <div>
                  <StatusBadge status={g.status} />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
