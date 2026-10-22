import { CERTAINTY_LABEL, type Level } from "@/domain/certainty";
import { cn } from "@/lib/utils";

const LEVELS: Level[] = [1, 2, 3, 4, 5];

export function CertaintyMeter({ level, reason, className }: { level: Level; reason: string; className?: string }) {
  const label = CERTAINTY_LABEL[level];
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2">
        <div role="img" aria-label={`Zekerheid ${level} van 5: ${label}`} className="flex gap-1">
          {LEVELS.map((n) => (
            <span key={n} className={cn("h-2 w-5 rounded-full", n <= level ? "bg-progress" : "bg-tint")} />
          ))}
        </div>
        <span aria-hidden className="text-sm font-semibold">
          {label}
        </span>
      </div>
      <p className="text-sm text-ink-2">{reason}</p>
    </div>
  );
}
