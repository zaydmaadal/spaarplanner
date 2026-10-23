import { Money } from "@/components/money";
import type { TokenColor } from "@/components/progress-bar";
import { formatMonthNl } from "@/domain/dates";
import type { GoalStatus } from "@/domain/projection";
import type { ISODate, YearMonth } from "@/domain/types";
import { cn } from "@/lib/utils";

const longDate = new Intl.DateTimeFormat("nl-BE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

// "donderdag 29 oktober". The date is a calendar day, so format it as UTC.
export const longDateNl = (d: ISODate) => longDate.format(new Date(`${d}T00:00:00Z`));

// The colour a goal got on creation (pot-1 to pot-4, repeating); the name and the amounts carry the meaning.
// Goals without one (not backfilled yet) take the first.
export const potColor = (goal: { colorToken: string | null }): TokenColor => `var(--color-${/^pot-[1-4]$/.test(goal.colorToken ?? "") ? goal.colorToken : "pot-1"})`;

// When a pot is full: "vol rond mei 2027", "vol", or "niet binnen 10 jaar" when the projection never gets there.
export function fillText(fill: YearMonth | "full" | null, horizonYears: number): string {
  if (fill === "full") return "vol";
  return fill ? `vol rond ${formatMonthNl(fill)}` : `niet binnen ${horizonYears} jaar`;
}

// Words always carry the status; the colour only backs them up.
const STATUS: Record<GoalStatus, { label: string; className: string }> = {
  op_schema: { label: "Op schema", className: "bg-tint text-ink" },
  krap: { label: "Krap", className: "bg-warn-bg text-warn-ink" },
  niet_haalbaar: { label: "Niet haalbaar", className: "border border-error text-error" },
};

export function StatusBadge({ status }: { status: GoalStatus | null }) {
  if (!status) return null;
  const { label, className } = STATUS[status];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold", className)}>{label}</span>;
}

// "Deze maand al opzij: € 120,00 van € 300,00": what is put aside this period against what the plan asks for it.
export function PeriodSaved({ goal }: { goal: { bookedCents: number; allocatedCents: number } }) {
  return (
    <p>
      Deze maand al opzij: <Money cents={goal.bookedCents} className="font-semibold text-ink" /> van <Money cents={goal.allocatedCents} className="font-semibold text-ink" />
    </p>
  );
}
