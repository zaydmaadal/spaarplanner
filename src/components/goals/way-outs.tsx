"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { savePlanAction } from "@/data/actions/plan";
import { formatMonthNl } from "@/domain/dates";
import { formatEUR, toEuroInput } from "@/domain/money";
import type { Cents } from "@/domain/types";
import type { WayOut } from "@/domain/way-outs";
import { cn } from "@/lib/utils";

const row = "flex min-h-11 w-full items-center justify-between gap-3 rounded-strip bg-surface px-4 py-2 text-left font-semibold transition-colors duration-(--duration-1) hover:bg-tint active:bg-tint";
const chevron = <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-2" />;

const euros = (cents: Cents) => String(Math.round(cents / 100)); // whole euros: the ways out are whole euro amounts

// The tappable ways out of a goal that is not full in time. On the goal screen (`goalId`) the deadline and the target open
// the edit form with the new value filled in; in the goal form itself (`onDeadline`, `onTarget`) they fill the field. Saving
// more changes the plan: the new savings amount is the current one plus the extra.
export function WayOuts({
  ways,
  savingsCents,
  goalId,
  onDeadline,
  onTarget,
}: {
  ways: WayOut[];
  savingsCents: Cents;
  goalId?: string;
  onDeadline?: (month: string) => void;
  onTarget?: (euros: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (ways.length === 0) return null;
  const edit = (query: string) => `/doelen/${goalId}/aanpassen?${query}`;

  const saveMore = (extraCents: Cents) =>
    startTransition(async () => {
      const result = await savePlanAction({ monthlySavings: toEuroInput(savingsCents + extraCents) }).catch(() => null);
      if (!result?.ok) return void toast.error(result ? result.error : "Dat lukte niet. Probeer het opnieuw.");
      toast.success(`Je spaart nu ${formatEUR(savingsCents + extraCents)} per maand.`);
      router.refresh();
    });

  return (
    <ul aria-label="Zo haal je het toch" className="flex flex-col gap-2">
      {ways.map((way) => {
        if (way.kind === "save_more") {
          return (
            <li key={way.kind}>
              <button type="button" disabled={pending} onClick={() => saveMore(way.extraCents)} className={cn(row, "disabled:opacity-50")}>
                Spaar {formatEUR(way.extraCents)} per maand meer
                {chevron}
              </button>
            </li>
          );
        }
        const [label, value, query] =
          way.kind === "move_deadline"
            ? [`Schuif de deadline naar ${formatMonthNl(way.month)}`, `${way.month.year}-${String(way.month.month).padStart(2, "0")}`, "deadline"]
            : [`Verlaag het doel naar ${formatEUR(way.targetCents)}`, euros(way.targetCents), "doelbedrag"];
        const handler = way.kind === "move_deadline" ? onDeadline : onTarget;
        return (
          <li key={way.kind}>
            {handler ? (
              <button type="button" onClick={() => handler(value)} className={row}>
                {label}
                {chevron}
              </button>
            ) : (
              <Link href={edit(`${query}=${value}`)} className={row}>
                {label}
                {chevron}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
