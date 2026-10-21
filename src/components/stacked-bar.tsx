import { Money } from "@/components/money";
import type { TokenColor } from "@/components/progress-bar";
import { cn } from "@/lib/utils";

export type Segment = { label: string; cents: number; color: TokenColor };

// The legend carries the meaning (label and amount per colour); the bar itself is decoration.
export function StackedBar({ segments, className }: { segments: Segment[]; className?: string }) {
  const shown = segments.filter((s) => s.cents > 0);
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div aria-hidden className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-tint">
        {shown.map((s) => (
          <div key={s.label} className="basis-0" style={{ flexGrow: s.cents, backgroundColor: s.color }} />
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-3 text-sm">
            <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="flex-1">{s.label}</span>
            <Money cents={s.cents} className="text-right" />
          </li>
        ))}
      </ul>
    </div>
  );
}
