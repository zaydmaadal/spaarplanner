import Link from "next/link";
import { useId } from "react";
import { Money } from "@/components/money";
import { fillText, StatusBadge } from "@/components/overview/labels";
import { CERTAINTY_LABEL } from "@/domain/certainty";
import type { GoalView } from "@/domain/dashboard";
import { formatMonthNl } from "@/domain/dates";
import { byFill } from "./helpers";

// Spec 8.6: the pots in the order they fill, each with its month. The month is the milestone; "vol" and "niet binnen
// 10 jaar" take its place for a pot that is full or does not fill within the horizon.
export function Timeline({ goals, horizonYears }: { goals: GoalView[]; horizonYears: number }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4 rounded-card bg-surface p-5">
      <h2 id={titleId} className="font-display text-xl font-semibold">
        Tijdlijn
      </h2>
      {goals.length === 0 ? (
        <>
          <p className="text-ink-2">Nog geen doelen.</p>
          <Link href="/doelen/nieuw" className="inline-flex h-11 items-center self-start rounded-md px-2 text-sm font-semibold underline underline-offset-4">
            Maak je eerste doel
          </Link>
        </>
      ) : (
        <ol className="flex flex-col">
          {byFill(goals).map((g) => (
            <li key={g.id} className="relative flex flex-col gap-1 border-l-2 border-hairline pb-5 pl-5 last:border-transparent last:pb-0">
              <span aria-hidden className="absolute top-1.5 -left-[7px] size-3 rounded-full bg-ink" />
              <p className="font-display text-lg font-semibold first-letter:uppercase">{g.fill && g.fill !== "full" ? formatMonthNl(g.fill) : fillText(g.fill, horizonYears)}</p>
              <h3 className="font-semibold">{g.name}</h3>
              <p className="text-sm text-ink-2">
                <Money cents={g.balanceCents} className="font-semibold text-ink" /> van <Money cents={g.targetCents} className="font-semibold text-ink" /> · {CERTAINTY_LABEL[g.fillCertainty.level]}
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
