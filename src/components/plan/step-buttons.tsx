"use client";

import { Check, EyeOff, Info } from "lucide-react";
import { Popover } from "radix-ui";
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
      else if (result.ok) toast.success(how === "done" ? "Afgevinkt." : "Verborgen.");
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

// The info icon behind a rule step: a popover with the sentence of the rule, and the way to hide the step for good
// ("Verberg"). A step you wrote yourself has neither; "Klaar" takes it off the list.
export function StepInfo({ step, title, detail }: { step: PlanStep; title: string; detail: string | null }) {
  const { pending, close } = useClose(step);
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={`Uitleg: ${title}`}
        className="relative z-10 -my-3 -mr-1 inline-flex size-11 items-center justify-center rounded-full align-middle text-ink-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
      >
        <Info aria-hidden className="size-4.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={4} collisionPadding={16} className="z-50 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-strip border border-hairline bg-surface p-3 text-sm text-ink shadow-lg">
          {detail && <p>{detail}</p>}
          <div className="flex flex-col items-start gap-1.5">
            <Button type="button" variant="outline" aria-label={`Verberg: ${title}`} disabled={pending} onClick={() => close("dismissed")}>
              <EyeOff aria-hidden />
              Verberg
            </Button>
            <p className="text-ink-2">Past dit niet bij jou? Dan komt deze stap niet meer terug.</p>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
