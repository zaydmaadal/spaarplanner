import type { TokenColor } from "@/components/progress-bar";
import { formatMonthNl } from "@/domain/dates";
import type { GoalStatus } from "@/domain/projection";
import type { ISODate, YearMonth } from "@/domain/types";
import { cn } from "@/lib/utils";

const longDate = new Intl.DateTimeFormat("nl-BE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

// "donderdag 29 oktober". The date is a calendar day, so format it as UTC.
export const longDateNl = (d: ISODate) => longDate.format(new Date(`${d}T00:00:00Z`));

// The four pot colours repeat after four pots; the name and the amounts carry the meaning.
export const potColor = (i: number): TokenColor => `var(--color-pot-${(i % 4) + 1})`;

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
