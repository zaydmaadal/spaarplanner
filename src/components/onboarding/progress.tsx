import { cn } from "@/lib/utils";

export const STEPS = 8;

export function OnboardingProgress({ step }: { step: number }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-ink-2">
        Stap {step} van {STEPS}
      </p>
      {/* The text above already says it; the segments are only a picture of it. */}
      <div aria-hidden className="grid grid-cols-8 gap-1">
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className={cn("h-1.5 rounded-full", i < step ? "bar-fill bg-progress" : "bg-tint")} style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}
