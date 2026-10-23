import Link from "next/link";
import { BudgetWarnings } from "@/components/budget-warnings";
import { CertaintyMeter } from "@/components/certainty-meter";
import { Money } from "@/components/money";
import type { Budget, BudgetWarning } from "@/domain/budget";
import type { Dashboard } from "@/domain/dashboard";
import type { BudgetLine, Cents } from "@/domain/types";
import { cn } from "@/lib/utils";

const sumOf = (lines: BudgetLine[], kind: BudgetLine["kind"]) => lines.filter((l) => l.kind === kind).reduce((total, l) => total + l.amountCents, 0);

// Where the net income of a month goes (spec 8.3), as tiles on the dark hero; the savings tile is the warm one. The labels
// and amounts carry the meaning; the total row closes it. With more savings than room there is no "Over" tile, and the
// warning says why.
export function SalarySplit({ lines, budget, savingsCents, savingsCertainty, warnings, className }: { lines: BudgetLine[]; budget: Budget; savingsCents: Cents; savingsCertainty: Dashboard["savingsCertainty"]; warnings: BudgetWarning[]; className?: string }) {
  const left = budget.roomCents - savingsCents;
  const parts = [
    { label: "Sparen", cents: savingsCents, spark: true },
    { label: "Vaste kosten", cents: sumOf(lines, "fixed") },
    { label: "Leven", cents: sumOf(lines, "living") },
    { label: "Vrije tijd", cents: sumOf(lines, "free") },
    { label: "Over", cents: left },
  ].filter((p) => p.cents > 0);

  return (
    <section aria-label="Verdeling van je loon" className={cn("flex flex-col gap-3 text-hero-ink", className)}>
      <h2 className="text-xs font-semibold tracking-widest text-hero-muted uppercase">Verdeling van je loon</h2>
      {parts.length === 0 ? (
        <>
          <p className="text-hero-muted">Je hebt nog geen inkomen of uitgaven ingevuld.</p>
          <Link href="/meer/inkomen" className="inline-flex h-11 items-center self-start rounded-md px-2 text-sm font-semibold text-hero-accent underline underline-offset-4">
            Inkomen invullen
          </Link>
        </>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-2">
            {parts.map((p) => (
              <li
                key={p.label}
                className={cn("flex flex-col rounded-strip border px-3 py-2", p.spark ? "col-span-2 border-spark bg-spark text-on-spark" : "border-hero-line bg-hero-tile")}
              >
                <span className={cn("text-xs", p.spark ? "font-semibold" : "text-hero-muted")}>{p.label}</span>
                <Money cents={p.cents} className={p.spark ? "text-2xl" : "text-lg"} />
              </li>
            ))}
          </ul>
          <BudgetWarnings warnings={warnings} />
          <div className="flex items-center justify-between gap-3 border-t border-hero-line pt-2 font-semibold">
            <span>Netto per maand</span>
            <Money cents={budget.incomeCents} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold">Zekerheid van je spaarbedrag</p>
            <CertaintyMeter onHero level={savingsCertainty.level} reason={savingsCertainty.reason} />
          </div>
        </>
      )}
    </section>
  );
}
