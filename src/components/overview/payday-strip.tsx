import { ProgressBar } from "@/components/progress-bar";
import type { ISODate } from "@/domain/types";
import { longDateNl } from "./labels";

const inDays = (n: number) => (n === 0 ? "Vandaag" : n === 1 ? "Morgen" : `Nog ${n} dagen`);

// Only for people with a fixed payday: the page leaves it out otherwise (spec 8.3).
export function PaydayStrip({ nextPayday, daysToPayday, progress }: { nextPayday: ISODate; daysToPayday: number; progress: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-strip bg-surface p-4">
      <p className="text-sm font-semibold text-ink-2">Volgende loondag</p>
      <div className="flex flex-col gap-0.5">
        <p className="font-display text-[2rem] leading-none font-semibold">{inDays(daysToPayday)}</p>
        <p className="text-sm text-ink-2 first-letter:uppercase">{longDateNl(nextPayday)}</p>
      </div>
      <ProgressBar value={progress} label="Voortgang van je periode" />
    </div>
  );
}
