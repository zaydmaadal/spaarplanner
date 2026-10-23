import { formatMonthNl, monthIndex } from "@/domain/dates";
import type { YearMonth } from "@/domain/types";
import { cn } from "@/lib/utils";

type Fill = YearMonth | "full" | null;

// How a slider moved one pot, in a few words for a badge: "2 mnd sneller". Only a move to or from a month counts; "full"
// stays full. The badge says nothing when the pot did not move.
export function shift(before: Fill, after: Fill): { text: string; faster: boolean } | null {
  if (before === after || before === "full" || after === "full") return null;
  if (before && after) {
    const n = monthIndex(after) - monthIndex(before);
    return n === 0 ? null : { text: `${Math.abs(n)} mnd ${n < 0 ? "sneller" : "later"}`, faster: n < 0 };
  }
  return after ? { text: "Nu haalbaar", faster: true } : { text: "Niet meer", faster: false };
}

// One pot: its dot and name with a badge for the change under it, and the month it is full as a compact date at the
// right edge. The row is high enough for the badge, so nothing below it moves while a slider does.
export function SimRow({ name, color, fill, change, horizonYears, animate }: { name: string; color: string; fill: Fill; change: ReturnType<typeof shift>; horizonYears: number; animate: boolean }) {
  const date = fill === "full" ? "Vol" : fill ? formatMonthNl(fill) : `Na ${horizonYears} jaar`;
  return (
    <li className="flex min-h-14 items-center gap-2.5 rounded-strip bg-tint px-3 py-1.5">
      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <span className="font-semibold break-words">{name}</span>
        {change && (
          <span className={cn("rise rounded-full px-2 py-px text-xs font-semibold whitespace-nowrap", change.faster ? "bg-tint-accent text-accent-ink" : "bg-warn-bg text-warn-ink")}>{change.text}</span>
        )}
      </span>
      {/* A new key replays the entrance, so a date that shifts visibly arrives. */}
      <span key={date} className={cn("min-w-[4.5rem] text-right font-semibold whitespace-nowrap tabular-nums", animate && "rise")}>
        {fill && fill !== "full" && <span className="sr-only">vol rond </span>}
        {date}
      </span>
    </li>
  );
}
