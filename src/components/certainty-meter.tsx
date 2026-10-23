import { CertaintyLabel } from "@/components/certainty-label";
import { CERTAINTY_LABEL, type Level } from "@/domain/certainty";
import { cn } from "@/lib/utils";

const LEVELS: Level[] = [1, 2, 3, 4, 5];

// `onHero`: on the dark hero card (hero tokens instead of progress and tint).
export function CertaintyMeter({ level, reason, className, onHero }: { level: Level; reason: string; className?: string; onHero?: boolean }) {
  const label = CERTAINTY_LABEL[level];
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2">
        <div role="img" aria-label={`Zekerheid ${level} van 5: ${label}`} className="flex gap-1">
          {LEVELS.map((n) => (
            <span key={n} className={cn("h-2 w-5 rounded-full", n <= level ? (onHero ? "bg-hero-accent" : "bg-progress") : onHero ? "bg-hero-track" : "bg-tint")} />
          ))}
        </div>
        <span className="text-sm font-semibold">
          <CertaintyLabel level={level} reason={reason} />
        </span>
      </div>
      <p className={cn("text-sm", onHero ? "text-hero-muted" : "text-ink-2")}>{reason}</p>
    </div>
  );
}
