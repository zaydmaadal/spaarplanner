"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { closeRuleItemAction, toggleChecklistItemAction } from "@/data/actions/checklist";
import type { ActionResult } from "@/data/schemas";
import type { PlanStep } from "./helpers";

// Close one step. A rule step is closed by its key (the same key never comes back); a step the user wrote has no separate
// "dismissed" state, so for it both ways mark it done, which takes it off the list.
function useClose(step: PlanStep) {
  const [pending, startTransition] = useTransition();
  const close = (how: "done" | "dismissed") =>
    startTransition(async () => {
      // A dropped connection throws, and a throw in a transition would show the error card of the whole screen.
      const result: ActionResult | null = await (step.source === "rule" ? closeRuleItemAction(step.key, how) : toggleChecklistItemAction(step.key)).catch(() => null);
      if (!result) toast.error("Opslaan lukte niet. Probeer het opnieuw.");
      else if (result.ok) toast.success(how === "done" ? "Afgevinkt." : "Weggeklikt.");
      else toast.error(result.error);
    });
  return { pending, close };
}

// The one action of a step in the list.
export function DoneButton({ step, title }: { step: PlanStep; title: string }) {
  const { pending, close } = useClose(step);
  return (
    <Button type="button" variant="outline" aria-label={`Afvinken: ${title}`} disabled={pending} onClick={() => close("done")}>
      <Check aria-hidden />
      Klaar
    </Button>
  );
}

// Inside the explanation: this step does not apply to me.
export function DismissButton({ step, title }: { step: PlanStep; title: string }) {
  const { pending, close } = useClose(step);
  return (
    <Button type="button" variant="ghost" aria-label={`Wegklikken: ${title}`} disabled={pending} onClick={() => close("dismissed")} className="self-start">
      Niet voor mij
    </Button>
  );
}
