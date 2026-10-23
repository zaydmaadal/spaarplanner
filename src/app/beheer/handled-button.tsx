"use client";

import { Check, Undo2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setFeedbackHandledAction } from "@/data/actions/admin";

// Marks one feedback row as handled, or opens it again. The action refreshes the page.
export function HandledButton({ id, handled }: { id: string; handled: boolean }) {
  const [pending, startTransition] = useTransition();
  const toggle = () =>
    startTransition(async () => {
      // A dropped connection throws, and a throw in a transition would show the error card of the whole screen.
      const result = await setFeedbackHandledAction({ id, handled: !handled }).catch(() => null);
      if (!result?.ok) toast.error(result ? result.error : "Dat lukte niet. Probeer het opnieuw.");
    });
  return (
    <Button type="button" variant="outline" onClick={toggle} disabled={pending}>
      {handled ? <Undo2 aria-hidden /> : <Check aria-hidden />}
      {handled ? "Heropenen" : "Afgehandeld"}
    </Button>
  );
}
