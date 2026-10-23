import { ProgressBar } from "@/components/progress-bar";
import type { ISODate } from "@/domain/types";
import { cn } from "@/lib/utils";
import { longDateNl } from "./labels";

// "Nog 9 dagen" with the number as the loudest figure; Vandaag and Morgen are words.
const inDays = (n: number) =>
  n === 0 ? (
    "Vandaag"
  ) : n === 1 ? (
    "Morgen"
  ) : (
    <>
      Nog <b className="mx-0.5 text-4xl leading-none font-semibold text-hero-accent">{n}</b> dagen
    </>
  );

// Only for people with a fixed payday: the page leaves it out otherwise (spec 8.3). A tile of the dark hero.
export function PaydayStrip({ nextPayday, daysToPayday, progress, className }: { nextPayday: ISODate; daysToPayday: number; progress: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2.5 rounded-strip border border-hero-line bg-hero-tile p-3", className)}>
      <div className="flex flex-col">
        <p className="text-sm font-semibold text-hero-muted">Volgende loondag</p>
        <p className="text-sm text-hero-ink first-letter:uppercase">{longDateNl(nextPayday)}</p>
      </div>
      <p className="flex items-baseline font-display text-lg text-hero-ink">{inDays(daysToPayday)}</p>
      <ProgressBar value={progress} label="Voortgang van je periode" color="var(--color-hero-accent)" className="col-span-2 h-1.5 bg-hero-track" />
    </div>
  );
}
