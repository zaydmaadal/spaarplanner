"use client";

import { Undo2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { potColor } from "@/components/overview/labels";
import { Button } from "@/components/ui/button";
import { unarchiveGoalAction } from "@/data/actions/goals";

// The archived goals under "Afgerond": hidden from the plan, history kept, one button to put a goal back.
export function ArchivedGoals({ goals }: { goals: { id: string; name: string; colorToken: string | null }[] }) {
  const [pending, startTransition] = useTransition();
  const restore = (id: string) =>
    startTransition(async () => {
      // A dropped connection throws, and a throw in a transition would show the error card of the whole screen.
      const result = await unarchiveGoalAction(id).catch(() => null);
      if (!result) return void toast.error("Dat lukte niet. Probeer het opnieuw.");
      if (result.ok) toast.success("Doel teruggezet.");
      else toast.error(result.error);
    });
  return (
    <section aria-label="Afgerond" className="flex flex-col gap-2">
      <h2 className="font-display text-xl font-semibold">Afgerond</h2>
      <ul className="flex flex-col gap-2">
        {goals.map((g) => (
          <li key={g.id} className="flex items-center justify-between gap-3 rounded-card bg-surface py-2 pr-2 pl-4 shadow-card">
            <span className="flex min-w-0 items-center gap-2.5">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: potColor(g) }} />
              <span className="font-semibold break-words">{g.name}</span>
            </span>
            <Button type="button" variant="outline" onClick={() => restore(g.id)} disabled={pending} aria-label={`${g.name} terugzetten`}>
              <Undo2 aria-hidden />
              Terugzetten
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
