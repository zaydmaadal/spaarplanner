"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { archiveGoalAction, setMainGoalAction, unarchiveGoalAction } from "@/data/actions/goals";

const UNDO_MS = 8000; // spec 8.4

// The two buttons of the goal screen that change the goal in place. The emergency fund cannot be archived.
export function GoalActions({ id, isMain, isEmergency }: { id: string; isMain: boolean; isEmergency: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const setMain = () =>
    startTransition(async () => {
      const result = await setMainGoalAction(id);
      if (result.ok) toast.success("Dit is nu je hoofddoel.");
      else toast.error(result.error);
    });

  // Archiving takes the main flag off; undoing gives it back.
  async function undo() {
    const back = await unarchiveGoalAction(id);
    const result = back.ok && isMain ? await setMainGoalAction(id) : back;
    if (result.ok) toast.success("Pot teruggezet.");
    else toast.error(result.error);
  }

  const archive = () =>
    startTransition(async () => {
      const result = await archiveGoalAction(id);
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
