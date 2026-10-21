import { ProgressBar } from "@/components/progress-bar";

export const STEPS = 8;

export function OnboardingProgress({ step }: { step: number }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-ink-2">
        Stap {step} van {STEPS}
      </p>
      <ProgressBar value={step / STEPS} label={`Stap ${step} van ${STEPS}`} />
    </div>
  );
}
