import { ProgressBar } from "@/components/progress-bar";

export const STEPS = 8;

export function OnboardingProgress({ step }: { step: number }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-ink-2">
        Stap {step} van {STEPS}
      </p>
      {/* The text above already says it; the bar is only a picture of it. */}
      <div aria-hidden>
        <ProgressBar value={step / STEPS} label={`Stap ${step} van ${STEPS}`} />
      </div>
    </div>
  );
}
