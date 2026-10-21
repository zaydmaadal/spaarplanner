import Link from "next/link";
import { useId } from "react";
import { CertaintyMeter } from "@/components/certainty-meter";
import { Money } from "@/components/money";
import { StackedBar, type Segment } from "@/components/stacked-bar";
import type { Budget } from "@/domain/budget";
import type { Dashboard } from "@/domain/dashboard";
import type { BudgetLine, Cents } from "@/domain/types";

const sumOf = (lines: BudgetLine[], kind: BudgetLine["kind"]) => lines.filter((l) => l.kind === kind).reduce((total, l) => total + l.amountCents, 0);

// Where the net income of a month goes (spec 8.3). The legend of the bar is the table; the total row closes it.
export function SalarySplit({ lines, budget, savingsCents, savingsCertainty }: { lines: BudgetLine[]; budget: Budget; savingsCents: Cents; savingsCertainty: Dashboard["savingsCertainty"] }) {
  const titleId = useId();
  const left = budget.roomCents - savingsCents;
  const parts: Segment[] = [
    { label: "Vaste kosten", cents: sumOf(lines, "fixed"), color: "var(--color-seg-fixed)" },
    { label: "Leven", cents: sumOf(lines, "living"), color: "var(--color-seg-living)" },
    { label: "Vrije tijd", cents: sumOf(lines, "free"), color: "var(--color-seg-free)" },
    { label: "Sparen", cents: savingsCents, color: "var(--color-seg-savings)" },
    { label: "Over", cents: left, color: "var(--color-tint)" },
  ];
  const segments = parts.filter((s) => s.cents > 0);

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4 rounded-card bg-surface p-5">
      <h2 id={titleId} className="font-display text-xl font-semibold">
        Verdeling van je loon
      </h2>
      {segments.length === 0 ? (
        <>
          <p className="text-ink-2">Je hebt nog geen inkomen of uitgaven ingevuld.</p>
          <Link href="/meer/inkomen" className="inline-flex h-11 items-center self-start rounded-md px-2 text-sm font-semibold underline underline-offset-4">
            Inkomen invullen
          </Link>
        </>
      ) : (
        <>
          <StackedBar segments={segments} />
          <div className="flex items-center justify-between gap-3 border-t pt-3 font-semibold">
            <span>Netto per maand</span>
            <Money cents={budget.incomeCents} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Zekerheid van je spaarbedrag</p>
            <CertaintyMeter level={savingsCertainty.level} reason={savingsCertainty.reason} />
          </div>
        </>
      )}
    </section>
  );
}
