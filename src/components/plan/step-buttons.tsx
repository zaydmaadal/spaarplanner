"use client";

import { Check, X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { closeRuleItemAction, toggleChecklistItemAction } from "@/data/actions/checklist";
import type { ActionResult } from "@/data/schemas";
import type { PlanStep } from "./helpers";

// Tick off or dismiss one step. A rule step is closed by its key (the same key never comes back); a step the user wrote
// has no separate "dismissed" state, so for it both buttons mark it done, which takes it off the list.
export function StepButtons({ step }: { step: PlanStep }) {
  const [pending, startTransition] = useTransition();
  const close = (how: "done" | "dismissed") =>
    startTransition(async () => {
      const result: ActionResult = await (step.source === "rule" ? closeRuleItemAction(step.key, how) : toggleChecklistItemAction(step.key));
      if (result.ok) toast.success(how === "done" ? "Afgevinkt." : "Weggeklikt.");
      else toast.error(result.error);
    });
  return (
    <div className="flex shrink-0">
      <Button type="button" variant="ghost" size="icon" aria-label={`Afvinken: ${step.title}`} disabled={pending} onClick={() => close("done")}>
        <Check aria-hidden />
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label={`Wegklikken: ${step.title}`} disabled={pending} onClick={() => close("dismissed")}>
        <X aria-hidden />
      </Button>
    </div>
  );
}
