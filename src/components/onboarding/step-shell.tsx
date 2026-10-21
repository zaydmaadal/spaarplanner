"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setOnboardingStepAction } from "@/data/actions/onboarding";
import type { ActionResult } from "@/data/schemas";
import { OnboardingProgress, STEPS } from "./progress";
import type { Errors } from "./rows";

// onboarding: the 8 steps after registering, each with progress, "Vorige" and "Overslaan". edit: the same form on its
// own page (Meer), saved with "Opslaan" and nothing else around it.
export type Mode = "onboarding" | "edit";

// What a step hands to its shell: save() returns an error message, or null when everything is stored.
export type Save = () => Promise<string | null>;

// Turns an action result into a message for the shell and field errors for the form.
export function outcome(result: ActionResult<unknown>, setErrors: (errors: Errors) => void): string | null {
  setErrors(result.ok ? {} : (result.fieldErrors ?? {}));
  return result.ok ? null : result.error;
}

function Buttons({ mode, step, nextLabel, onSkip }: { mode: Mode; step: number; nextLabel: string; onSkip: () => Promise<void> }) {
  const { pending } = useFormStatus();
  if (mode === "edit") {
    return (
      <Button type="submit" size="lg" disabled={pending}>
        Opslaan
      </Button>
    );
  }
  return (
    <>
      <Button type="submit" size="lg" disabled={pending}>
        {nextLabel}
      </Button>
      <div className="flex items-center justify-between">
        {step > 1 ? (
          <Link href={`/onboarding/${step - 1}`} className="inline-flex h-11 items-center rounded-md px-2 text-sm font-semibold underline underline-offset-4">
            Vorige
          </Link>
        ) : (
          <span />
        )}
        <Button type="submit" variant="ghost" formAction={onSkip} formNoValidate disabled={pending}>
          Overslaan
        </Button>
      </div>
    </>
  );
}

export function StepShell({
  mode,
  step,
  title,
  intro,
  save,
  nextLabel = "Volgende",
  finish,
  children,
}: {
  mode: Mode;
  step: number;
  title: string;
  intro?: string;
  save: Save;
  nextLabel?: string;
  finish?: () => Promise<ActionResult>; // step 8 only: the fund, the start balance and the end of the onboarding
  children: ReactNode;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function go(withSave: boolean) {
    setError(null);
    const message = withSave ? await save() : null;
    if (message) return setError(message);
    if (mode === "edit") return void toast.success("Opgeslagen.");
    const last = step === STEPS;
    const moved = last ? await finish!() : await setOnboardingStepAction(step + 1);
    if (!moved.ok) return setError(moved.error);
    if (last) router.replace("/overzicht");
    else router.push(`/onboarding/${step + 1}`);
  }

  return (
    <form action={() => go(true)} noValidate className="flex flex-col gap-6">
      {mode === "onboarding" && <OnboardingProgress step={step} />}
      <div className="flex flex-col gap-5 rounded-card bg-surface p-5">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          {intro && <p className="text-ink-2">{intro}</p>}
        </div>
        {children}
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-error">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Buttons mode={mode} step={step} nextLabel={nextLabel} onSkip={() => go(false)} />
      </div>
    </form>
  );
}
