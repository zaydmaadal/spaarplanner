"use client";

import { useRouter } from "next/navigation";
import { useTransition, type MouseEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { archiveGoalAction, setMainGoalAction, unarchiveGoalAction } from "@/data/actions/goals";

const UNDO_MS = 8000; // spec 8.4
const FAILED = "Dat lukte niet. Probeer het opnieuw.";

// The two buttons of the goal screen that change the goal in place. The emergency fund cannot be archived.
export function GoalActions({ id, isMain, isEmergency }: { id: string; isMain: boolean; isEmergency: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // The button goes away once this is the main goal: the focus goes to the page title (found before, while the button is still in the page).
  const setMain = (event: MouseEvent<HTMLElement>) => {
    const title = event.currentTarget.closest(":has(h1)")?.querySelector("h1");
    startTransition(async () => {
      // A dropped connection throws, and a throw in a transition would show the error card of the whole screen.
      const result = await setMainGoalAction(id).catch(() => null);
      if (!result) return void toast.error(FAILED);
      if (result.ok) {
        toast.success("Dit is nu je hoofddoel.");
        title?.focus({ preventScroll: true });
      } else toast.error(result.error);
    });
  };

  // Archiving takes the main flag off; undoing gives it back.
  async function undo() {
    try {
      const back = await unarchiveGoalAction(id);
      const result = back.ok && isMain ? await setMainGoalAction(id) : back;
      if (result.ok) toast.success("Pot teruggezet.");
      else toast.error(result.error);
    } catch {
      toast.error(FAILED); // the toast's own action has no caller to catch this
    }
  }

  const archive = () =>
    startTransition(async () => {
      const result = await archiveGoalAction(id).catch(() => null);
      if (!result) return void toast.error(FAILED);
      if (!result.ok) return void toast.error(result.error);
      toast("Pot gearchiveerd", { duration: UNDO_MS, action: { label: "Ongedaan maken", onClick: undo } });
      router.push("/doelen");
    });

  return (
    <>
      {!isMain && (
        <Button type="button" variant="outline" onClick={setMain} disabled={pending}>
          Als hoofddoel instellen
        </Button>
      )}
      {!isEmergency && (
        <Button type="button" variant="outline" onClick={archive} disabled={pending}>
          Archiveren
        </Button>
      )}
    </>
  );
}
